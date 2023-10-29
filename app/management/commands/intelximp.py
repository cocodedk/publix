import re
import time
from django.conf import settings
from django.core.management.base import BaseCommand
from app.lib.intelxapi import intelx
from app.lib.intelx_search import IntelxSearch
from django.utils.html import escape
from pygments import highlight
from pygments.lexers import JsonLexer
from pygments.formatters import TerminalFormatter
import json
from app.models import MainData, Relation, Tagsh, ContentLine, TLD, Domain
from django.db import IntegrityError
import requests
from django.db import IntegrityError, transaction
from app.lib.cryptography import Encryptor
from django.core.exceptions import ObjectDoesNotExist

def save_tlds():
    response = requests.get('https://data.iana.org/TLD/tlds-alpha-by-domain.txt')
    # Decode the response and split it into lines
    lines = response.content.decode().split('\n')
    # The first line is a comment, so we skip it
    # All TLDs are in uppercase, so we convert them to lowercase
    tlds = [line.lower() for line in lines[1:] if line]

    for tld in tlds:
        try:
            # This will create a new TLD object for each TLD in the file            
            TLD.objects.create(name=tld)
        except IntegrityError:
            # If the TLD already exists in the database, we skip it
            pass


class Command(BaseCommand):
    help = 'Fetch data from Intelx and insert into LeakedCredential model'

    def add_arguments(self, parser):
        parser.add_argument('search_term', type=str, help='The search term for the Intelx API')
        parser.add_argument('maxresults', type=int, help='The maximum number of results to fetch')

    def handle(self, *args, **options):
        search_term = options['search_term'].strip().lower()
        maxresults = options['maxresults']
        
        intelx_search = IntelxSearch(search_term, maxresults)

        encryptor = Encryptor(settings.ENCRYPTION_KEY + settings.SALT)

        # save tlds
        save_tlds()

        print('Searching for: ' + search_term)
        print('Max results: ' + str(maxresults))
   
        results = intelx_search.search()
        
        print(highlight(json.dumps(results, indent=4), JsonLexer(), TerminalFormatter()))

        # sleep for 1 second to avoid rate limiting
        time.sleep(1)

        # delete all the MainData objects
        # MainData.objects.all().delete()

        for result in results['records']:
            # Handle nested fields separately
            # result is dict and has 'relations' and 'tagsh' keys
            # assign them and remove them from result dict

            # print the type of result
            print(type(result))

            relations_data = result.pop('relations', [])

            if relations_data is None:
                relations_data = []

            tagshs_data = result.pop('tagsh', [])
            
            if tagshs_data is not None:
                for tagsh in tagshs_data:
                    # Change 'class' key in each tagsh item to 'class_field'
                    tagsh['class_field'] = tagsh.pop('class', None)
            else:
                tagshs_data = []

            print(highlight(json.dumps(result, indent=4), JsonLexer(), TerminalFormatter()))

            # convert the simhash to string
            result['simhash'] = str(result['simhash'])

            # Create MainData object, skip if already exists
            try:
                main_data, created = MainData.objects.get_or_create(systemid=result['systemid'], defaults=result)
            except Exception as e:
                print(e)
                print(result)
                continue

            content_lines = ContentLine.search_by_email(email=search_term, salt=settings.SALT, main_data=main_data)

            # if the count of content_lines is greater than 0 continue
            if len(content_lines) > 0:
                print(f"Found {len(content_lines)} hits in ContentLine objects")
                for content_line in content_lines:
                    print(encryptor.decrypt(content_line.line))
                    print(encryptor.decrypt(content_line.email))
                    print(encryptor.decrypt(content_line.password))
                # continue to the next iteration
                continue

            # Create related objects
            for relation_data in relations_data:
                Relation.objects.get_or_create(main_data=main_data, **relation_data)

            for tagsh_data in tagshs_data:
                Tagsh.objects.get_or_create(main_data=main_data, **tagsh_data)

            # Get file contents
            contents = intelx_search.get_content(result)

            # sleep for 3 second to avoid rate limiting
            time.sleep(3)

            # Create ContentLine objects
            for line in contents.splitlines():

                # if search_term not is in line continue
                if search_term not in line.lower():
                    continue

                email, password, domain, tld = None, None, None, None
                try:
                    
                    email, password = intelx_search.parse_line(line)                    
                    
                    # strip the email and password

                    # if email is not None strip it else continue
                    if email is not None and '@' in email and '.' in email:
                        # remove everything from the email which is not . or @ or alphanumeric
                        email = re.sub('[^a-zA-Z0-9@.]', '', email)
                        
                        # print the line
                        print(line)
                    else:
                        continue

                    # if password is not None strip it
                    if password is not None:
                        password = password.strip()

                    # get the domain the email
                    domain = email.split('@')[-1]

                    # get the tld from the domain
                    tld = domain.split('.')[-1]
                    
                    # Remove non-alphanumeric and non-hyphen characters
                    tld = re.sub('[^a-zA-Z0-9-]', '', tld)

                    # if domain or ltd is None throw ValueError
                    if domain is None or tld is None:
                        raise ValueError(f"domain or tld is None: {domain} {tld}")

                    # get the tld object from the TLD class                    
                    tld_obj = TLD.objects.get(name=tld)
                    # if not tld_obj throw an exception
                    if tld_obj is None:
                        print(f"The TLD does not exist: {tld}")
                        tld = re.sub('[^a-zA-Z]', '', tld)
                        tld_obj = TLD.objects.get(name=tld)
                        if tld_obj is None:
                            print(f"The TLD does not exist: {tld}")
                            # print a 20 dots
                            print('.' * 20)
                            raise Exception(f"tld_obj is None")
                    
                    # use get_or_create_with_retry to get the domain object
                    domain_obj, created = self.get_or_create_with_retry(Domain, name=domain, tld=tld_obj)

                except ValueError as e:
                    print(e)
                    continue
                except Exception as e:
                    print(e)
                    continue

                try:
                    content_line = ContentLine(main_data=main_data, line=line, email=email, password=password, domain=domain_obj)
                    content_line.save(encryptor=encryptor, salt=settings.SALT)
                except Exception as e:
                    print(e)
                    print(f"Error creating ContentLine object: {e}")
                    continue
    
    def get_or_create_with_retry(self, model, **kwargs):
        retry_attempts = 5  # Adjust this to fit your needs
        for attempt in range(retry_attempts):
            try:
                with transaction.atomic():
                    return model.objects.get_or_create(**kwargs)
            except IntegrityError:
                if attempt < retry_attempts - 1:  # i.e. not the last attempt
                    time.sleep(0.1)  # Wait for 100 milliseconds
                else:  # Last attempt
                    try:
                        return model.objects.get(**kwargs), False
                    except ObjectDoesNotExist:
                        print(f"Unable to get object with kwargs: {kwargs}")
                        raise IntegrityError("Unable to get or create object")

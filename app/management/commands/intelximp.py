import re
import time
from django.core.management.base import BaseCommand
from app.lib.intelxapi import intelx
from django.utils.html import escape
from pygments import highlight
from pygments.lexers import JsonLexer
from pygments.formatters import TerminalFormatter
import json
from app.models import MainData, Relation, Tagsh, ContentLine


class Command(BaseCommand):
    help = 'Fetch data from Intelx and insert into LeakedCredential model'

    def add_arguments(self, parser):
        parser.add_argument('search_term', type=str, help='The search term for the Intelx API')
        parser.add_argument('maxresults', type=int, help='The maximum number of results to fetch')

    def handle(self, *args, **options):
        search_term = options['search_term']
        maxresults = options['maxresults']
                
        b = ['leaks.public']

        intelx_obj = intelx('2eb95861-c110-4485-9359-5f29927dcea6')

        print('Searching for: ' + search_term)
        print('Max results: ' + str(maxresults))

   
        results = intelx_obj.search(search_term , maxresults=maxresults, buckets=b)
        
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
            tagshs_data = result.pop('tagsh', [])

            # Change 'class' key in each tagsh item to 'class_field'
            for tagsh in tagshs_data:
                tagsh['class_field'] = tagsh.pop('class', None)

            print(highlight(json.dumps(result, indent=4), JsonLexer(), TerminalFormatter()))

            # convert the simhash to string
            result['simhash'] = str(result['simhash'])

            # Create MainData object, skip if already exists
            main_data, created = MainData.objects.get_or_create(systemid=result['systemid'], defaults=result)
            if not created:
                print(main_data)
                print(f"MainData with systemid {result['systemid']} already exists, skipping")

                # find the search term in the ContentLine objects
                # search in the line, email and password fields
                hits = ContentLine.objects.filter(main_data=main_data).filter(line__icontains=search_term).count()
                if hits > 0:
                    print(f"Found {hits} hits in ContentLine objects, skipping")
                    # print the findings
                    for content_line in ContentLine.objects.filter(main_data=main_data).filter(line__icontains=search_term):
                        print(content_line.line)
                        print(content_line.email)
                        print(content_line.password)
                        print('-------------------')
                    continue

                continue

            # Create related objects
            for relation_data in relations_data:
                Relation.objects.get_or_create(main_data=main_data, **relation_data)

            for tagsh_data in tagshs_data:
                Tagsh.objects.get_or_create(main_data=main_data, **tagsh_data)

            # Get file contents
            contents = intelx_obj.FILE_VIEW(1, result['media'], result['storageid'], result['bucket'])

            # sleep for 3 second to avoid rate limiting
            time.sleep(3)

            # Create ContentLine objects
            for line in contents.splitlines():
                email, password = None, None
                try:
                    if ',' in line:
                        parts = line.split(',')
                        email, password = parts[2], parts[3] if len(parts) > 3 else None
                    elif ':' in line:
                        email, password = self.parse_line(line)
                except ValueError as e:
                    print(e)
                    continue
                except Exception as e:
                    print(e)
                    continue                


                try:
                    # if line os longer than 200 chars raise exception
                    if len(line) > 200:
                        raise Exception(f"Line {line} is longer than 200 chars")
                    
                    ContentLine.objects.create(main_data=main_data, line=line, email=email, password=password)
                except Exception as e:
                    print(f"Error creating ContentLine object: {e}")
                    continue
    
    def parse_line(self, line):
        parts = line.split(':', 2)  # Only split on the first two colons
        if len(parts) < 2:
            raise ValueError(f"Invalid format. The line should be in the format 'email:password' in {line}")
        email = parts[0]
        password = parts[1]
        return email, password
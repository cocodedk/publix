from django.shortcuts import render
from .models import ContentLine, Domain, TLD
from .forms import SearchForm
# immport ENCRYPTION_KEY and SALT from settings
from django.conf import settings
# import the encryptor class from cryptography.py
from app.lib.cryptography import Encryptor


def index_view(request):
    form = SearchForm()

    if request.method == 'POST':
        form = SearchForm(request.POST)
        if form.is_valid():

            query = form.cleaned_data.get('query')

            email_results = search(query)

            # Check if the results exist
            if email_results:

                results = decrypt(email_results)

                return render(request, 'index.html', {'results': results, 'form': form, 'query': query})

            else:
                return render(request, 'index.html', {'form': form, 'error': 'No results found', 'query': query})

    # If not POST or form is not valid, return to the search form
    return render(request, 'index.html', {'form': form})


# create a function which decrypts the email_results and returns them
def decrypt(email_results):
    # Create encryptor object
    encryptor = Encryptor(settings.ENCRYPTION_KEY + settings.SALT)

    # create and array of dictionaries with email, password and line
    results = []

    # Decrypt the email and password and print them
    for content_line in email_results:
        results.append({
            # 'line': encryptor.decrypt(content_line.line),
            'email': encryptor.decrypt(content_line.email),
            'password': encryptor.decrypt(content_line.password),
            'main_data': content_line.main_data
        })

    return results

# create a function which returns the email_results. Get inspiration from the above code
def search(query):
    # set the email_results to None
    email_results = []

    # search the tld table for the query
    # if the results are found find the related content lines
    # accumulate the email_results

    tld_results = TLD.objects.filter(name=query)
    if tld_results.exists():
        # create and array of dictionaries with email, password and line
        results = []
        for tld in tld_results:
            domains = Domain.objects.filter(tld=tld)
            for domain in domains:
                # accumulate the results                                
                email_results.extend(ContentLine.objects.filter(domain=domain))

    # else if no tld is found search the domain table for the query
    # if the results are found find the related content lines
    if len(email_results) is 0:
        domain_results = Domain.objects.filter(name=query)
        if domain_results.exists():
            # create and array of dictionaries with email, password and line
            for domain in domain_results:
                email_results.extend(ContentLine.objects.filter(domain=domain))


    if len(email_results) is 0:
        email_results = ContentLine.search_by_email(query, settings.SALT)
        # password_results = ContentLine.search_by_password(query, settings.SALT)
    
    return email_results
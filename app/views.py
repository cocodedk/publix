from django.shortcuts import render
from .models import ContentLine
from .forms import SearchForm
# immport ENCRYPTION_KEY and SALT from settings
from django.conf import settings
# import the encryptor class from cryptography.py
from .cryptography import Encryptor


def index_view(request):
    form = SearchForm()

    if request.method == 'POST':
        form = SearchForm(request.POST)
        if form.is_valid():

            query = form.cleaned_data.get('query')

            email_results = ContentLine.search_by_email(query, settings.SALT)
            # password_results = ContentLine.search_by_password(query, settings.SALT)

            # Combine email_results and password_results if needed

            # Check if the results exist
            if email_results.exists():

                print(f"Found {len(email_results)} hits in ContentLine objects")

                # Create encryptor object
                encryptor = Encryptor(settings.ENCRYPTION_KEY + settings.SALT)

                # create and array of dictionaries with email, password and line
                results = []

                # Decrypt the email and password and print them
                for content_line in email_results:
                    results.append({
                        'line': encryptor.decrypt(content_line.line),
                        'email': encryptor.decrypt(content_line.email),
                        'password': encryptor.decrypt(content_line.password),
                        'main_data': content_line.main_data
                    })

                return render(request, 'index.html', {'results': results, 'form': form, 'query': query})

            else:
                return render(request, 'index.html', {'form': form, 'error': 'No results found', 'query': query})

    # If not POST or form is not valid, return to the search form
    return render(request, 'index.html', {'form': form})
# Create your views here.

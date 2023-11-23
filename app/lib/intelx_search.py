# this is wrapper for intelx api
# this class will perform the search and return the results
# this is made to organize the code and make it more readable
# get inspiration from the code in app/management/commands/intelximp.py

from app.lib.intelxapi import intelx
from django.conf import settings

class IntelxSearch:
    def __init__(self, search_term, maxresults):
        self.search_term = search_term.strip().lower()
        self.maxresults = maxresults
        self.intelx_obj = intelx(settings.INTELX_KEY)
        # Buckets
        # PastesPRO
        # Darknet: TorPRO
        # Darknet: I2PPRO
        # WhoisPRO
        # UsenetPRO
        # LeaksPRO
        # Leaks COMBPRO
        # Bot LogsPRO
        # WikiLeaks
        # Public Leaks
        # Dumpster
        # Sci-Hub
        self.b = ['leaks.public', 'dumpster', 'buckets', 'pastespro', 'darknet.tor', 'darknet.i2p', 'whois', 'usenet', 'leaks', 'leaks.bro', 'bot.logs', 'wikileaks', 'sci-hub']

    def search(self):
        results = self.intelx_obj.search(self.search_term , maxresults=self.maxresults, buckets=self.b)
        return results
    
    # create a function to get the content of the result
    # which uses this
    # contents = intelx_obj.FILE_VIEW(1, result['media'], result['storageid'], result['bucket'])
    def get_content(self, result):
        return self.intelx_obj.FILE_VIEW(1, result['media'], result['storageid'], result['bucket'])
    
    def parse_line(self, line):

        # if line is NoneType raise ValueError
        if line is None:
            raise ValueError("line is None in Parse_Line")

        separators = [',', ';']
        for separator in separators:
            line = line.replace(separator, ':')
        
        parts = line.split(':', 2)
        if len(parts) < 2:
            raise ValueError(f"Invalid format. The line should be in the format 'email:password' in {line}")

        return parts[0], parts[1]
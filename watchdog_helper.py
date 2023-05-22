#! python3
## Using watchdog to monitor file changes
## This script will listen to file changes and and if the file is html or css, it will create a random.py file
## and this will trigger the livereload server to reload the server

import os
import random
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class watch:
    def __init__(self, path = "./app"):
        self.observer = Observer()
        self.path = path

    def run(self):
        event_handler = MyHandler()
        self.observer.schedule(event_handler, self.path, recursive=True)
        self.observer.start()
        try:
            # output text to the console that the url_toucher is running
            print("**************************************************")
            print("********* whatchdog_helper.py is running *********")
            print("**************************************************")
            while True:
                time.sleep(4)
        except:
            self.observer.stop()
            print("Error")
        self.observer.join()

class MyHandler(FileSystemEventHandler):
    def on_modified(self, event):
        print("File modified: ", event.src_path)
        # if the file type is html or css, then touch the urls.py file
        if event.src_path.endswith(".html") or event.src_path.endswith(".css"):
            print("**********************************")
            print("******* Changing random.py *******")
            print("**********************************")
            # os.system("touch ./ITSVAMF/urls.py")
            ## generate some random text from a string and add a random number from 1 to 999999 to it
            command = "echo 'print({0})' > ./app/random.py".format(random.randint(1, 999999))        
            os.system(command)
        
        
if __name__ == '__main__':
    w = watch()
    w.run()
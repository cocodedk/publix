from django.core.management.base import BaseCommand
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os
import random
import time


class WatchdogHandler(FileSystemEventHandler):
    def on_modified(self, event):
        self.process(event)

    def on_created(self, event):
        self.process(event)

    def on_deleted(self, event):
        self.process(event)

    def process(self, event):        
        if event.src_path.endswith(".html") or event.src_path.endswith(".css"):
            print(f"Event type: {event.event_type} path : {event.src_path}")
            print("**********************************")
            print("******* Changing random.py *******")
            print("**********************************")
            command = "echo 'print({0})' > /code/app/random.py".format(random.randint(1, 999999))
            os.system(command)
            os.system("chmod 666 /code/app/random.py")


class Command(BaseCommand):
    help = "Starts the watchdog command"

    def handle(self, *args, **options):
        path = "/code"
        observer = Observer()
        event_handler = WatchdogHandler()
        observer.schedule(event_handler, path, recursive=True)
        observer.start()
        try:
            # output text to the console that the url_toucher is running
            self.stdout.write(self.style.SUCCESS("********* watchdog_command.py is running *********"))
            while True:
                time.sleep(4)
        except Exception as e:
            observer.stop()
            self.stderr.write(self.style.ERROR(f"Error: {e}"))
        observer.join()

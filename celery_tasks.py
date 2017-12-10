from celery import Celery
import downloader as dl

CELERY_NAME = 'concert'
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

celery = Celery(CELERY_NAME, backend=CELERY_RESULT_BACKEND, broker=CELERY_BROKER_URL)

@celery.task
def async_download(url):
	#Hopefully some front end validation done for urls
	dl.download_song(url)
	
if __name__ == '__main__':
    celery.start()
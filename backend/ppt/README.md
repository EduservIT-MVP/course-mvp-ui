# PPTX Templates Directory

Place static `.pptx` templates in this directory. 

Currently, the `mock_agents_server.py` reads the template from this directory (e.g., `Advanced Topic- 2.Access Token Management.pptx`) and serves it over HTTP to simulate a real PPT Agent generating a presentation. 

The Flask API's background Celery worker then downloads this binary payload and saves it to the course's `artifacts` directory as `{course-slug}-theory.pptx`. 

Source files in this directory are never edited.

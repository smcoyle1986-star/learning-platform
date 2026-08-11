from pathlib import Path
from pypdf import PdfReader, PdfWriter
for slug in ["transportation-vocabulary-beginner-esl", "jobs-vocabulary-beginner-esl", "places-in-town-vocabulary-beginner-esl", "home-furniture-vocabulary-beginner-esl", "school-subjects-vocabulary-beginner-esl", "toys-vocabulary-beginner-esl", "sports-vocabulary-beginner-esl", "nature-vocabulary-beginner-esl", "numbers-vocabulary-beginner-esl", "time-vocabulary-beginner-esl", "kitchen-objects-vocabulary-beginner-esl"]:
    source=Path("public/free-resources")/(slug+".pdf")
    original=PdfReader(source); worksheet=PdfReader(Path("/private/tmp")/(slug+"-classendo.pdf"))
    output=PdfWriter()
    for index,page in enumerate(original.pages): output.add_page(worksheet.pages[0] if index==4 else page)
    output.add_metadata({"/Title": f"{slug.replace('-', ' ').title()} - Beginner ESL", "/Author":"Classendo"})
    with source.open("wb") as stream: output.write(stream)

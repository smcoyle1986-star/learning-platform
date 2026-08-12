from pathlib import Path
import sys
from pypdf import PdfReader, PdfWriter
slugs = ["transportation-vocabulary-beginner-esl", "jobs-vocabulary-beginner-esl", "places-in-town-vocabulary-beginner-esl", "home-furniture-vocabulary-beginner-esl", "school-subjects-vocabulary-beginner-esl", "toys-vocabulary-beginner-esl", "sports-vocabulary-beginner-esl", "nature-vocabulary-beginner-esl", "numbers-vocabulary-beginner-esl", "time-vocabulary-beginner-esl", "kitchen-objects-vocabulary-beginner-esl", "morning-routine-verbs-beginner-esl", "after-school-verbs-beginner-esl", "home-chores-verbs-beginner-esl", "food-actions-verbs-beginner-esl", "classroom-actions-verbs-beginner-esl", "speaking-skills-verbs-beginner-esl", "five-senses-verbs-beginner-esl", "thinking-verbs-beginner-esl", "travel-actions-verbs-beginner-esl", "active-verbs-beginner-esl", "creative-activities-verbs-beginner-esl", "outdoor-adventures-verbs-beginner-esl", "games-and-play-verbs-beginner-esl", "friends-and-communication-verbs-beginner-esl", "learning-and-study-verbs-beginner-esl", "size-and-shape-adjectives-beginner-esl", "colors-adjectives-beginner-esl", "feelings-adjectives-beginner-esl", "food-adjectives-beginner-esl"]
selected = set(sys.argv[1:])
for slug in [candidate for candidate in slugs if not selected or candidate in selected]:
    source=Path("public/free-resources")/(slug+".pdf")
    original=PdfReader(source); worksheet=PdfReader(Path("/private/tmp")/(slug+"-classendo.pdf"))
    output=PdfWriter()
    for index,page in enumerate(original.pages): output.add_page(worksheet.pages[0] if index==4 else page)
    output.add_metadata({"/Title": f"{slug.replace('-', ' ').title()} - Beginner ESL", "/Author":"Classendo"})
    with source.open("wb") as stream: output.write(stream)

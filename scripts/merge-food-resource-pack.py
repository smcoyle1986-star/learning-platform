from pathlib import Path
from pypdf import PdfReader, PdfWriter

root = Path.cwd()
core = PdfReader(root / "public/free-resources/food-core.pdf")
battleship = PdfReader("/private/tmp/food-battleship.pdf")
bullseye = PdfReader("/private/tmp/food-bullseye.pdf")
writer = PdfWriter()

# The first six core pages are followed by the genuine Classendo worksheet pages,
# then the lesson plan and teacher notes. This produces the published 10-page pack.
for source in [*core.pages[:6], battleship.pages[0], bullseye.pages[0], *core.pages[6:]]:
    writer.add_page(source)
writer.add_metadata({"/Title": "Food Vocabulary - Beginner ESL", "/Author": "Classendo", "/Subject": "Free printable beginner ESL lesson pack"})
with open(root / "public/free-resources/food-vocabulary-beginner-esl.pdf", "wb") as output:
    writer.write(output)

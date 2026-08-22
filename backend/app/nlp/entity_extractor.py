import spacy


nlp = spacy.load("en_core_web_sm")


def extract_entities(text):
    doc = nlp(text)

    entities = []

    for ent in doc.ents:
        entities.append({
            "text": ent.text,
            "label": ent.label_
        })

    return entities


if __name__ == "__main__":
    sample_text = (
        "A major strike at Rotterdam Port "
        "has disrupted cargo operations in the Netherlands."
    )

    result = extract_entities(sample_text)

    for entity in result:
        print(entity)
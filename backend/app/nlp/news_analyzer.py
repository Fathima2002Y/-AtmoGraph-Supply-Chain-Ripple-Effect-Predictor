from backend.app.nlp.entity_extractor import extract_entities
from backend.app.nlp.risk_detector import detect_disruptions


def analyze_news(text):
    entities = extract_entities(text)
    disruptions = detect_disruptions(text)

    return {
        "text": text,
        "entities": entities,
        "disruptions": disruptions
    }


if __name__ == "__main__":
    sample_text = (
        "A major strike at Rotterdam Port "
        "has caused shipment delays in the Netherlands."
    )

    result = analyze_news(sample_text)

    print("News:")
    print(result["text"])

    print("\nEntities:")
    for entity in result["entities"]:
        print(entity)

    print("\nDisruptions:")
    for disruption in result["disruptions"]:
        print(disruption)
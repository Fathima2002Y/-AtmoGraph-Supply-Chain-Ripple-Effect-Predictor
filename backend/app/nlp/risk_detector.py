DISRUPTION_KEYWORDS = {
    "strike": "high",
    "shutdown": "high",
    "earthquake": "high",
    "flood": "high",
    "fire": "high",
    "war": "high",

    "shortage": "medium",
    "delay": "medium",
    "congestion": "medium",
    "protest": "medium"
}


def detect_disruptions(text):
    text_lower = text.lower()

    detected_events = []

    for keyword, severity in DISRUPTION_KEYWORDS.items():
        if keyword in text_lower:
            detected_events.append({
                "event": keyword,
                "severity": severity
            })

    return detected_events


if __name__ == "__main__":
    sample_text = (
        "A major strike at Rotterdam Port "
        "has caused shipment delays."
    )

    result = detect_disruptions(sample_text)

    for event in result:
        print(event)
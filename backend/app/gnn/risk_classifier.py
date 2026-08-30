def classify_risk(risk_score):

    if risk_score >= 0.60:
        return "HIGH"

    elif risk_score >= 0.30:
        return "MEDIUM"

    else:
        return "LOW"


def add_risk_levels(predictions):

    results = []

    for prediction in predictions:

        risk_score = prediction["predicted_risk"]

        risk_level = classify_risk(
            risk_score
        )

        result = prediction.copy()

        result["risk_level"] = risk_level

        results.append(result)

    return results
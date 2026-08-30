from backend.app.database.neo4j_connection import driver


SEVERITY_TO_RISK = {
    "low": 0.30,
    "medium": 0.60,
    "high": 0.90
}


def apply_disruption(node_id, severity="high"):

    if severity not in SEVERITY_TO_RISK:
        raise ValueError(
            "Severity must be low, medium, or high"
        )

    risk_score = SEVERITY_TO_RISK[severity]

    query = """
    MATCH (n {node_id: $node_id})

    SET n.risk_score = $risk_score,
        n.status = "disrupted"

    RETURN
        n.node_id AS node_id,
        n.name AS name,
        labels(n)[0] AS node_type,
        n.risk_score AS risk_score,
        n.status AS status
    """

    with driver.session() as session:

        result = session.run(
            query,
            node_id=node_id,
            risk_score=risk_score
        )

        record = result.single()

        if record is None:
            return None

        return dict(record)


def reset_disruptions():

    query = """
    MATCH (n)

    SET n.risk_score = 0.1,
        n.status = "normal"

    RETURN count(n) AS reset_count
    """

    with driver.session() as session:

        result = session.run(query)

        record = result.single()

        return record["reset_count"]
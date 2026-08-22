from backend.app.database.neo4j_connection import driver


SEVERITY_TO_RISK = {
    "low": 0.30,
    "medium": 0.60,
    "high": 0.90
}


def find_node_by_name(name):
    query = """
    MATCH (n)
    WHERE toLower(n.name) = toLower($name)
    RETURN
        n.node_id AS node_id,
        n.name AS name,
        labels(n)[0] AS node_type,
        n.risk_score AS risk_score,
        n.status AS status
    LIMIT 1
    """

    with driver.session() as session:
        result = session.run(query, name=name)
        record = result.single()

        if record is None:
            return None

        return dict(record)


def update_node_risk(name, severity):
    risk_score = SEVERITY_TO_RISK.get(severity)

    if risk_score is None:
        return None

    query = """
    MATCH (n)
    WHERE toLower(n.name) = toLower($name)

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
            name=name,
            risk_score=risk_score
        )

        record = result.single()

        if record is None:
            return None

        return dict(record)


if __name__ == "__main__":
    node = find_node_by_name("Rotterdam Port")
    print(node)
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

        result = session.run(
            query,
            name=name
        )

        record = result.single()

        if record is None:
            return None

        return dict(record)


def update_node_risk(name, severity):

    risk_score = SEVERITY_TO_RISK.get(
        severity
    )

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


def get_supply_chain_graph():

    node_query = """
    MATCH (n)

    RETURN
        n.node_id AS node_id,
        n.name AS name,
        labels(n)[0] AS node_type,
        n.risk_score AS risk_score,
        n.status AS status

    ORDER BY n.node_id
    """

    relationship_query = """
    MATCH (source)-[r]->(target)

    RETURN
        source.node_id AS source_id,
        target.node_id AS target_id,
        type(r) AS relationship_type
    """

    with driver.session() as session:

        node_records = list(
            session.run(node_query)
        )

        relationship_records = list(
            session.run(relationship_query)
        )

    nodes = [
        dict(node)
        for node in node_records
    ]

    relationships = [
        dict(relationship)
        for relationship in relationship_records
    ]

    return {
        "nodes": nodes,
        "relationships": relationships
    }


def get_node_neighbors(node_id):

    query = """
    MATCH (n {node_id: $node_id})

    OPTIONAL MATCH (n)-[r]-(neighbor)

    RETURN
        n.node_id AS source_id,
        neighbor.node_id AS neighbor_id,
        neighbor.name AS neighbor_name,
        labels(neighbor)[0] AS neighbor_type,
        neighbor.risk_score AS neighbor_risk_score,
        neighbor.status AS neighbor_status,
        type(r) AS relationship_type

    ORDER BY neighbor.node_id
    """

    with driver.session() as session:

        result = session.run(
            query,
            node_id=node_id
        )

        records = list(result)

    if not records:
        return None

    neighbors = []

    for record in records:

        if record["neighbor_id"] is None:
            continue

        neighbors.append({
            "node_id": record["neighbor_id"],
            "name": record["neighbor_name"],
            "node_type": record["neighbor_type"],
            "risk_score": record["neighbor_risk_score"],
            "status": record["neighbor_status"],
            "relationship_type": record["relationship_type"]
        })

    return neighbors


if __name__ == "__main__":

    node = find_node_by_name(
        "Rotterdam Port"
    )

    print(node)

    graph = get_supply_chain_graph()

    print(
        "Nodes:",
        len(graph["nodes"])
    )

    print(
        "Relationships:",
        len(graph["relationships"])
    )

    neighbors = get_node_neighbors("P001")

    print(
        "P001 neighbors:",
        neighbors
    )
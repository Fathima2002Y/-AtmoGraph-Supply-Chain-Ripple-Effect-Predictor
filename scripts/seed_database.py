import os

import pandas as pd
from dotenv import load_dotenv
from neo4j import GraphDatabase


load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")


driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
)


def load_nodes(file_path, label):
    df = pd.read_csv(file_path)

    with driver.session() as session:
        for _, row in df.iterrows():
            properties = row.to_dict()

            query = f"""
            MERGE (n:{label} {{node_id: $node_id}})
            SET n += $properties
            """

            session.run(
                query,
                node_id=properties["node_id"],
                properties=properties
            )

    print(f"Loaded {len(df)} {label} nodes")


def load_relationships(file_path):
    df = pd.read_csv(file_path)

    with driver.session() as session:
        for _, row in df.iterrows():
            relationship_type = row["relationship_type"]

            query = f"""
            MATCH (source {{node_id: $source_id}})
            MATCH (target {{node_id: $target_id}})
            MERGE (source)-[r:{relationship_type}]->(target)
            SET r.quantity = $quantity,
                r.lead_time_days = $lead_time_days,
                r.dependency = $dependency
            """

            session.run(
                query,
                source_id=row["source_id"],
                target_id=row["target_id"],
                quantity=float(row["quantity"]),
                lead_time_days=float(row["lead_time_days"]),
                dependency=float(row["dependency"])
            )

    print(f"Loaded {len(df)} relationships")


def main():
    load_nodes("data/suppliers.csv", "Supplier")
    load_nodes("data/manufacturers.csv", "Manufacturer")
    load_nodes("data/ports.csv", "Port")
    load_nodes("data/distributors.csv", "Distributor")
    load_nodes("data/retailers.csv", "Retailer")
    load_nodes("data/products.csv", "Product")

    load_relationships("data/relationships.csv")

    driver.close()

    print("AtmoGraph database seeded successfully")


if __name__ == "__main__":
    main()
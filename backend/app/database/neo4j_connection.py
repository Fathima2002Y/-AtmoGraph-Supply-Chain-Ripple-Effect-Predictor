import os

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


def test_connection():
    try:
        driver.verify_connectivity()
        print("Successfully connected to Neo4j")

        with driver.session() as session:
            result = session.run(
                "MATCH (n) RETURN count(n) AS node_count"
            )

            record = result.single()

            print(
                "Total nodes in Neo4j:",
                record["node_count"]
            )

    except Exception as error:
        print("Neo4j connection failed:")
        print(error)


if __name__ == "__main__":
    test_connection()
    driver.close()
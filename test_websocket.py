import asyncio
import websockets


async def test_websocket():

    uri = "ws://127.0.0.1:8000/api/v1/ws/predictions"

    print("Connecting to WebSocket...")

    async with websockets.connect(uri) as websocket:

        print("Connected successfully!")

        predictions = await websocket.recv()

        print("Received prediction data:")
        print(predictions[:500])

        print("\nWebSocket test completed successfully.")


asyncio.run(test_websocket())
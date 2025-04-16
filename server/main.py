from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import CORS Middleware
from pydantic import BaseModel
import base64
from io import BytesIO
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Vision Assist API")

# --- Add CORS Middleware --- S
# Origins from which requests should be allowed.
# For development, we allow all origins ('*').
# For production, you should restrict this to your specific frontend origin(s).
origins = [
    "*", # Allows all origins
    # e.g., "http://localhost", "http://localhost:8081", "https://your-frontend-domain.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True, # Allows cookies if needed
    allow_methods=["*"],    # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],    # Allows all headers
)
# --- End of CORS Middleware ---

class ImagePayload(BaseModel):
    image_base64: str

@app.get("/")
async def read_root():
    """Root endpoint to check if the server is running."""
    logger.info("Root endpoint accessed.") # Add log
    return {"message": "Vision Assist API is running!"}

@app.post("/infer")
async def infer_image(payload: ImagePayload):
    """Accepts a base64 encoded image and returns a placeholder description."""
    logger.info("Received request for inference.")
    try:
        if not payload.image_base64:
            logger.error("Received empty image_base64 string.")
            # Use status_code parameter for FastAPI error responses
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="No image data provided")

        # Decode the base64 string
        try:
            image_data = base64.b64decode(payload.image_base64)
            logger.info(f"Decoded base64 image data, size: {len(image_data)} bytes.")
        except base64.binascii.Error as e:
            logger.error(f"Base64 decoding error: {e}")
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Invalid base64 string: {e}")

        # Try to open the image to verify it's valid
        try:
            img = Image.open(BytesIO(image_data))
            logger.info(f"Successfully opened image. Format: {img.format}, Size: {img.size}")
            img.verify() # Verify image integrity
             # Re-open after verify
            img = Image.open(BytesIO(image_data))
        except Exception as e:
            logger.error(f"Invalid image data: {e}")
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

        # --- TODO: Replace this section with actual CV/LLM model inference ---
        # Placeholder logic for the MVP
        logger.info("Generating placeholder description.")
        description = "Placeholder response: The image was received successfully!"
        # --- End of placeholder logic ---

        logger.info(f"Returning description: {description}")
        return {"description": description}

    except Exception as e:
        # Log the full traceback for unexpected errors
        logger.exception("An unexpected error occurred during inference.")
        from fastapi import HTTPException
        # Reraise as HTTPException for proper FastAPI error handling
        if isinstance(e, HTTPException):
            raise e # Re-raise if it's already an HTTPException
        else:
            raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")

# Add a simple command to run the server easily - suitable for development
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server with uvicorn...")
    # Use 0.0.0.0 to make it accessible on your local network
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    # Note: reload=True is great for development, disable for production 
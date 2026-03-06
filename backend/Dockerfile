# Use Python 3.12 as the base
FROM python:3.12

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies for PostgreSQL and building tools
RUN apt-get update && apt-get install -y libpq-dev gcc

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your Django code
COPY . .

# Daphne is used to handle both HTTP and WebSockets
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "core.asgi:application"]
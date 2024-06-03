FROM python:3.11.8-slim-bullseye

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update \
	&& apt-get install -y \
	libfontconfig1 \
	libmagic-dev \
	unzip \
	wget \
	&& rm -rf /var/lib/apt/lists/* 


COPY ./requirements.txt .

RUN pip install --upgrade pip

# install dependencies
RUN pip install -r requirements.txt

COPY . .
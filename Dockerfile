FROM raspbian/stretch

RUN mkdir -p /app
WORKDIR /app
COPY . /app

RUN apt update \
  && apt install -y --no-install-recommends curl

ENV WORKDIR=/app PATH=/app/bin:${PATH} TERM=xterm CONTAINER=vinylcast LANG=C.UTF-8

EXPOSE 3030

RUN curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -

RUN apt update && \
  apt install -y --no-install-recommends \
  build-essential libssl-dev \
  avahi-daemon avahi-discover libnss-mdns libavahi-compat-libdnssd-dev \
  libasound2-dev \
  nodejs \
  && \
  rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json /app/
RUN [ "npm", "install" ]

CMD [ "node", "server.js" ]
FROM node:16.2.0-alpine3.13 as builder

RUN apk update

RUN apk --no-cache --update add alpine-sdk && \
    apk --no-cache --update add libffi-dev openssl-dev && \
    apk --no-cache --update add build-base && \
    apk --no-cache --update add openjdk11

# Need git because some of our npm depedencies might be coming
# straight from github instead of being an npm package on npmjs.com.
RUN apk add --no-cache git

# Some install scripts of the npm package fabric-network need python
RUN apk add --no-cache python3 py3-pip

WORKDIR /
RUN mkdir /app/
WORKDIR /app/
COPY ./ ./
RUN npm ci
RUN ./node_modules/.bin/lerna clean --yes
RUN ./node_modules/.bin/lerna bootstrap
RUN npm run build:dev:backend
RUN npm run webpack:dev:web
RUN npm run build:dev:frontend -- --scope='@hyperledger/cactus-example-supply-chain-frontend'
RUN ./node_modules/.bin/lerna clean --yes
RUN ./node_modules/.bin/lerna bootstrap -- --production --no-optional

RUN rm -rf ./packages/cactus-test-plugin*
RUN rm -rf ./packages/cactus-test-cmd*
RUN rm -rf ./packages/cactus-test-api*
RUN rm -rf ./node_modules/

FROM docker:20.10.2-dind-rootless as runner

USER root

RUN apk update

# Add bash for convenience, sh has less features
RUN apk add --no-cache bash

# Need curl for healthchecks
RUN apk add --no-cache curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apk add --no-cache file

RUN apk add --no-cache nodejs
RUN apk add --no-cache npm

RUN apk add --no-cache ca-certificates
RUN apk add --no-cache tzdata

# Install supervisord because we need to run the docker daemon and also the fabric network
# meaning that we have multiple processes to run.
RUN apk add --no-cache supervisor

ARG APP=/usr/src/app/

ENV TZ=Etc/UTC
ENV APP_USER=appuser

RUN addgroup --system $APP_USER
RUN adduser --system $APP_USER -G $APP_USER
RUN addgroup $APP_USER rootless
RUN mkdir -p ${APP}

COPY --chown=$APP_USER:$APP_USER --from=builder /app/ ${APP}

RUN mkdir -p "${APP}/log/"
RUN chown -R $APP_USER:$APP_USER "${APP}/log/"

# TODO: Can we hack it together so that the whole thing works rootless?
# USER $APP_USER

WORKDIR ${APP}

COPY --chown=${APP_USER}:${APP_USER} ./examples/supply-chain-app/healthcheck.sh /

ENV CACTUS_NODE_ID=-
ENV CONSORTIUM_ID=-
ENV KEY_PAIR_PEM=-
ENV COCKPIT_WWW_ROOT=examples/cactus-example-supply-chain-frontend/www/
ENV COCKPIT_TLS_ENABLED=false
ENV COCKPIT_CORS_DOMAIN_CSV=\*
ENV COCKPIT_MTLS_ENABLED=false
ENV COCKPIT_TLS_CERT_PEM=-
ENV COCKPIT_TLS_KEY_PEM=-
ENV COCKPIT_TLS_CLIENT_CA_PEM=-
ENV COCKPIT_HOST=0.0.0.0
ENV COCKPIT_PORT=3000
ENV API_MTLS_ENABLED=false
ENV API_TLS_ENABLED=false
ENV API_CORS_DOMAIN_CSV=\*
ENV API_TLS_CERT_PEM=-
ENV API_TLS_CLIENT_CA_PEM=-
ENV API_TLS_KEY_PEM=-
ENV API_HOST=0.0.0.0
ENV API_PORT=4000
ENV LOG_LEVEL=TRACE

COPY examples/supply-chain-app/supervisord.conf /etc/supervisord.conf

# supervisord web ui/dashboard
EXPOSE 9001
# API #1
EXPOSE 4000
# API #2
EXPOSE 4100
# GUI #1
EXPOSE 3000
# GUI #2
EXPOSE 3100
# API #3
EXPOSE 4200
# GUI #3
EXPOSE 3200

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
HEALTHCHECK --interval=1s --timeout=5s --start-period=20s --retries=250 \
    CMD /usr/src/app/examples/supply-chain-app/healthcheck.sh

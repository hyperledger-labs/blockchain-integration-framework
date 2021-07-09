FROM node:16.3.0-buster-slim as builder

RUN apt-get update
RUN apt-get -y upgrade

# Generic dependencies that are usually needed by other software
RUN apt-get install -y build-essential libssl-dev libffi-dev python3-dev

# Need git because some of our npm depedencies might be coming
# straight from github instead of being an npm package on npmjs.com.
RUN apt-get install -y git

# Need OpenJDK for the OpenAPI generator tool
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /opt
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && curl \
        -L \
        -o openjdk.tar.gz \
        https://download.java.net/java/GA/jdk11/13/GPL/openjdk-11.0.1_linux-x64_bin.tar.gz \
    && mkdir jdk \
    && tar zxf openjdk.tar.gz -C jdk --strip-components=1 \
    && rm -rf openjdk.tar.gz \
    && ln -sf /opt/jdk/bin/* /usr/local/bin/ \
    && java  --version \
    && javac --version \
    && jlink --version

# Some install scripts of the npm package fabric-network need python/pip
RUN apt-get install -y python3-pip

WORKDIR /
RUN mkdir /app/
WORKDIR /app/
COPY ./ ./
RUN npm ci
RUN ./node_modules/.bin/lerna clean --yes
RUN ./node_modules/.bin/lerna bootstrap
RUN npm rebuild
RUN npm run build:dev:backend
RUN npm run webpack:dev:web
RUN npm run build:dev:frontend -- --scope='@hyperledger/cactus-example-carbon-accounting-frontend'

RUN rm -rf ./packages/cactus-test-plugin*
RUN rm -rf ./packages/cactus-test-cmd*
RUN rm -rf ./packages/cactus-test-api*
RUN rm -rf ./node_modules/

FROM cruizba/ubuntu-dind:19.03.11 as runner

USER root

RUN apt-get update
RUN apt -y upgrade

# Need curl for healthchecks
RUN apt-get -y install --no-install-recommends curl

# The file binary is used to inspect exectubles when debugging container image issues
RUN apt-get -y install --no-install-recommends file


RUN apt-get -y install --no-install-recommends ca-certificates
RUN apt-get -y install --no-install-recommends tzdata

ARG APP=/usr/src/app/

ENV TZ=Etc/UTC
ENV APP_USER=appuser

RUN useradd -m ${APP_USER}
RUN usermod -a -G ${APP_USER} ${APP_USER}
RUN mkdir -p ${APP}

COPY --chown=$APP_USER:$APP_USER --from=builder /app/ ${APP}

RUN mkdir -p "${APP}/log/"
RUN chown -R $APP_USER:$APP_USER "${APP}/log/"

# TODO: Can we hack it together so that the whole thing works rootless?
USER ${APP_USER}

SHELL ["/bin/bash", "--login", "-i", "-c"]

# Installing Node Version Manager (nvm)
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
RUN source ~/.bashrc && nvm install 16.3.0
SHELL ["/bin/bash", "--login", "-c"]

WORKDIR ${APP}

COPY --chown=${APP_USER}:${APP_USER} ./examples/carbon-accounting/healthcheck.sh /

ENV AUTHORIZATION_CONFIG_JSON="{}"
ENV AUTHORIZATION_PROTOCOL=NONE
ENV CACTUS_NODE_ID=-
ENV CONSORTIUM_ID=-
ENV KEY_PAIR_PEM=-
ENV COCKPIT_WWW_ROOT=examples/cactus-example-carbon-accounting-frontend/www/
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

COPY examples/carbon-accounting/supervisord.conf /etc/supervisord.conf

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

USER root

# Extend the parent image's entrypoint
# https://superuser.com/questions/1459466/can-i-add-an-additional-docker-entrypoint-script
ENTRYPOINT ["/usr/bin/supervisord"]
CMD ["--configuration", "/etc/supervisord.conf", "--nodaemon"]
HEALTHCHECK --interval=1s --timeout=5s --start-period=20s --retries=250 \
    CMD /usr/src/app/examples/carbon-accounting/healthcheck.sh

FROM alpine:3.19 as builder

RUN apk add --no-cache \
    build-base \
    pcre-dev \
    zlib-dev \
    openssl-dev \
    wget \
    git && \
    wget http://nginx.org/download/nginx-1.26.3.tar.gz && \
    tar -zxf nginx-1.26.3.tar.gz && \
    git clone https://github.com/winshining/nginx-http-flv-module.git && \
    cd nginx-1.26.3 && \
    ./configure --add-module=../nginx-http-flv-module && \
    make -j$(nproc) && make install && \
    rm -rf /nginx-1.26.3.tar.gz /nginx-1.26.3 /nginx-http-flv-module

FROM alpine:3.19

COPY --from=builder /usr/local/nginx /usr/local/nginx

# Install runtime dependencies including gettext for envsubst
RUN apk add --no-cache \
    pcre \
    zlib \
    openssl \
    ffmpeg \
    shadow \
    gettext && \
    addgroup -S nginx && \
    adduser -S -D -H -G nginx -s /sbin/nologin nginx && \
    mkdir -p /usr/local/nginx/proxy_temp /usr/local/nginx/client_body_temp && \
    chown -R nginx:nginx /usr/local/nginx

# Create directory for template files
RUN mkdir -p /etc/nginx/templates

EXPOSE 80 1935 8888

# Create an entrypoint script to handle environment variable substitution
RUN echo '#!/bin/sh \n\
# Replace environment variables in configuration templates \n\
for template in /etc/nginx/templates/*.conf.template; do \n\
  if [ -f "$template" ]; then \n\
    output_file="/usr/local/nginx/conf/$(basename $template .template)" \n\
    echo "Processing template: $template -> $output_file" \n\
    envsubst "$(env | awk -F= "{printf \\\"\\\$%s \\\",\\\$1}")" < $template > $output_file \n\
  fi \n\
done \n\
\n\
# Start Nginx \n\
exec "$@"' > /docker-entrypoint.sh && \
chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["/usr/local/nginx/sbin/nginx", "-g", "daemon off;"]
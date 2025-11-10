#!/bin/sh
set -e

UID=${UID:-1000}
GID=${GID:-1000}

echo "Setting UID to $UID and GID to $GID"
usermod -u $UID nginx 2>/dev/null || echo "Failed to change UID"
groupmod -g $GID nginx 2>/dev/null || echo "Failed to change GID"

mkdir -p /usr/local/nginx/conf
for template in /etc/nginx/templates/*.conf.template; do
  if [ -f "$template" ]; then
    output_file="/usr/local/nginx/conf/$(basename $template .template)"
    echo "Processing template: $template -> $output_file"
    envsubst '${API_AUTH}' < $template > $output_file
  fi
done

mkdir -p /usr/local/nginx/proxy_temp /usr/local/nginx/client_body_temp
mkdir -p /var/www/html
chown -R nginx:nginx /usr/local/nginx /var/www/html

echo "Testing nginx configuration..."
/usr/local/nginx/sbin/nginx -t

exec "$@"
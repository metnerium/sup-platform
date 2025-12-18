#!/bin/bash

# SUP Messenger - Let's Encrypt SSL initialization script

set -e

# Configuration
domains=(yourdomain.com www.yourdomain.com)
email="admin@yourdomain.com"
staging=1 # Set to 1 for testing, 0 for production

echo "### Initializing Let's Encrypt SSL for SUP Messenger ###"
echo ""

# Check if docker-compose is available
if ! [ -x "$(command -v docker-compose)" ]; then
  echo 'Error: docker-compose is not installed.' >&2
  exit 1
fi

# Create necessary directories
mkdir -p certbot/conf
mkdir -p certbot/www

# Download recommended TLS parameters
if [ ! -f "certbot/conf/options-ssl-nginx.conf" ]; then
  echo "### Downloading recommended TLS parameters..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
fi

if [ ! -f "certbot/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading SSL DH parameters..."
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
fi

# Create dummy certificate for initial nginx start
echo "### Creating dummy certificate for ${domains[0]}..."
path="/etc/letsencrypt/live/${domains[0]}"
mkdir -p "certbot/conf/live/${domains[0]}"

docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo ""
echo "### Starting nginx..."
docker-compose up -d nginx

echo ""
echo "### Removing dummy certificate..."
docker-compose run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/${domains[0]} && \
  rm -rf /etc/letsencrypt/archive/${domains[0]} && \
  rm -rf /etc/letsencrypt/renewal/${domains[0]}.conf" certbot

# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if necessary
if [ $staging != "0" ]; then staging_arg="--staging"; fi

# Request certificate
echo ""
echo "### Requesting Let's Encrypt certificate for ${domains[*]}..."

domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

echo ""
echo "### Reloading nginx..."
docker-compose exec nginx nginx -s reload

echo ""
echo "### SSL certificates obtained successfully!"
echo "### Update config/nginx/conf.d/default.conf to enable HTTPS server block"
echo "### Then run: docker-compose restart nginx"

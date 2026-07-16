FROM php:8.3-apache-bookworm@sha256:ff23b916a51fb99b2a2afddb8649d1b96e15337f6b15fb0ce5179a950c00aae2

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install mbstring mysqli \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod headers \
    && sed -ri 's!Listen 80!Listen 8080!' /etc/apache2/ports.conf \
    && sed -ri 's!<VirtualHost \*:80>!<VirtualHost *:8080>!' /etc/apache2/sites-available/000-default.conf \
    && printf 'ServerName localhost\nOptions -Indexes\nHeader always set X-Content-Type-Options "nosniff"\nHeader always set Referrer-Policy "strict-origin-when-cross-origin"\nHeader always set X-Frame-Options "DENY"\n' > /etc/apache2/conf-available/grand-oral-security.conf \
    && a2enconf grand-oral-security \
    && chown -R www-data:www-data /var/run/apache2 /var/lock/apache2 /var/log/apache2

COPY --chown=www-data:www-data . /var/www/html/

RUN rm -f /var/www/html/.env /var/www/html/.env.* \
    && find /var/www/html -type d -exec chmod 0755 {} + \
    && find /var/www/html -type f -exec chmod 0644 {} +

USER www-data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD php -r '$result = @file_get_contents("http://127.0.0.1:8080/health.php"); exit($result === "ok\n" ? 0 : 1);'

CMD ["apache2-foreground"]

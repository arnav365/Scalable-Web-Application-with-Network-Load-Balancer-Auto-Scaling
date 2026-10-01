#!/bin/bash
# ---------------------------------------------------------------------------
# Project 05 — EC2 user data (Ubuntu 24.04 LTS)
#
# Paste into the launch template's "User data" field. On first boot it:
#   1. installs and starts Apache2
#   2. deploys the Network Flow Lab site to /var/www/html
#   3. writes /var/www/html/instance.json from the instance metadata (IMDSv2)
#
# instance.json is what the site's "Probe live NLB" button and
# test-nlb.sh read to prove which instance served each request.
# ---------------------------------------------------------------------------
set -euxo pipefail

# Repository that contains the project5-nlb-autoscaling/ folder.
# Change this if you fork the project.
REPO_URL="https://github.com/arnav365/Scalable-Web-Application-with-Network-Load-Balancer-Auto-Scaling.git"
SITE_DIR="project5-nlb-autoscaling"
WEB_ROOT="/var/www/html"

export DEBIAN_FRONTEND=noninteractive

# 1. Apache2 -----------------------------------------------------------------
apt-get update -y
apt-get install -y apache2 git curl
systemctl enable apache2
systemctl start apache2

# 2. Site --------------------------------------------------------------------
if git clone --depth 1 "$REPO_URL" /tmp/site; then
  rm -f "$WEB_ROOT/index.html"
  cp -r "/tmp/site/$SITE_DIR/index.html" "/tmp/site/$SITE_DIR/src" "/tmp/site/$SITE_DIR/public" "$WEB_ROOT/"
  rm -rf /tmp/site
else
  # Fallback page if GitHub is unreachable from the instance
  cat > "$WEB_ROOT/index.html" <<'HTML'
<!doctype html><html lang="en"><meta charset="utf-8"><title>Project 05 · EC2</title>
<body style="font-family:system-ui;padding:40px;background:#f3f1ec;color:#16181b">
<h1>Apache2 is running behind the NLB.</h1>
<p>Instance details: <a href="/instance.json">/instance.json</a></p></body></html>
HTML
fi

# 3. Instance identity (IMDSv2) ---------------------------------------------
TOKEN=$(curl -sS -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
md() {
  curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/$1"
}

INSTANCE_ID=$(md instance-id)
AZ=$(md placement/availability-zone)
PRIVATE_IP=$(md local-ipv4)
INSTANCE_TYPE=$(md instance-type)

cat > "$WEB_ROOT/instance.json" <<JSON
{
  "instance_id": "${INSTANCE_ID}",
  "availability_zone": "${AZ}",
  "private_ip": "${PRIVATE_IP}",
  "instance_type": "${INSTANCE_TYPE}",
  "hostname": "$(hostname)",
  "os": "Ubuntu 24.04 LTS",
  "web_server": "Apache2",
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

# Never cache instance.json, so each request shows the instance that served it
a2enmod headers
cat > /etc/apache2/conf-available/p5-instance-json.conf <<'CONF'
<Files "instance.json">
  Header set Cache-Control "no-store"
</Files>
CONF
a2enconf p5-instance-json
systemctl reload apache2

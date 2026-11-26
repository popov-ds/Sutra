import os, paramiko
PASS = os.environ.get("SUTRAMAX_SSH_PASS") or os.environ.get("SSH_PASS", "")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("168.113.171.219", username="root", password=PASS, timeout=60)
for domain in [
    "sutra.max.dreamer-soft.pro",
    "yoga.telegram.dreamer-soft.pro",
    "support.dreamer-soft.pro",
    "payment.dreamer-soft.pro",
]:
    cmd = (
        f"echo '--- {domain} ---'; "
        f"echo | openssl s_client -connect {domain}:443 -servername {domain} -showcerts 2>/dev/null "
        f"| openssl x509 -noout -issuer -subject 2>/dev/null; "
        f"echo | openssl s_client -connect {domain}:443 -servername {domain} 2>/dev/null "
        f"| awk '/Certificate chain|depth=/{print}' | head -10"
    )
    _, o, _ = c.exec_command(cmd, timeout=30)
    o.channel.recv_exit_status()
    print(o.read().decode())
c.close()
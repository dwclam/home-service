#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if (( $# != 0 )); then
    echo 'Không nhận tham số. Điền ADMIN_EMAIL và ADMIN_PASS trong backend/.env.' >&2
    exit 1
fi

# Build only; never invoke spring-boot:run or load .env into the shell.
./mvnw -q -DskipTests compile dependency:build-classpath -DincludeScope=runtime -Dmdep.outputFile=target/admin-classpath.txt

# Java trên Windows (Git Bash/MSYS/Cygwin) dùng ';' làm dấu phân cách classpath, Linux/macOS dùng ':'.
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) SEP=';' ;;
    *) SEP=':' ;;
esac

exec java -cp "target/classes${SEP}$(cat target/admin-classpath.txt)" com.homeservice.admin.tool.CreateAdmin
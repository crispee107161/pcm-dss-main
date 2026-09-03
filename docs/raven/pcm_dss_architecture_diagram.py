from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.client import Client
from diagrams.onprem.database import Postgresql
from diagrams.programming.framework import React
from diagrams.programming.language import Nodejs
from diagrams.generic.network import Firewall
from diagrams.generic.compute import Rack

graph_attr = {
    "splines": "spline",
    "nodesep": "0.7",
    "ranksep": "1.1",
    "fontsize": "22",
}

with Diagram(
    "PC Merchandise DSS - System Architecture",
    show=False,
    direction="TB",
    graph_attr=graph_attr,
):

    browser = Client("Browser\n(role-gated dashboard UI)")

    with Cluster("Next.js App Router (server)"):
        middleware = Firewall("middleware.ts\n(JWT role guard)")
        auth_guard = Firewall("lib/auth-guard.ts\nrequireUsableSession()\n(covers report export/print routes)")
        server_components = React("Server Components\n(page.tsx - direct Prisma reads)")
        client_components = React("Client Components\n(charts, forms, filters)")
        middleware >> Edge(color="black", style="dashed", label="also gates") >> auth_guard
        middleware >> Edge(color="black") >> server_components
        server_components >> Edge(color="black", label="props") >> client_components

    with Cluster("Server Actions ('use server')"):
        auth_action = Nodejs("lib/auth.ts\nauthorize()")
        upload_action = Nodejs("actions/upload.ts")
        classify_action = Nodejs("actions/classify-posts.ts")
        admin_action = Nodejs("actions/admin.ts\n(lock/unlock, roles)")
        security_log = Nodejs("lib/security-log.ts\nlogSecurityEvent()")
        auth_action >> Edge(color="black", label="on every auth/admin event") >> security_log
        admin_action >> Edge(color="black") >> security_log

    with Cluster("Data + external services"):
        prisma = Rack("Prisma ORM")
        db = Postgresql("PostgreSQL\n(Neon prod / local dev)")
        groq = Rack("Groq AI API\n(ALG-05 LLM categorisation)")
        prisma >> Edge(color="black") >> db

    # 1. Read flow (blue)
    browser >> Edge(label="  1. navigate", color="blue") >> middleware
    server_components >> Edge(label="  direct query", color="blue") >> prisma

    # 2. Upload/mutation flow (green)
    browser >> Edge(label="  2. upload CSV", color="green") >> upload_action
    upload_action >> Edge(color="green") >> prisma

    # 3. AI categorisation flow (orange)
    browser >> Edge(label="  3. S4 categorisation", color="orange") >> classify_action
    classify_action >> Edge(label="ALG-05", color="orange") >> groq
    classify_action >> Edge(color="orange") >> prisma

    # 4. Auth / lockout flow (red)
    browser >> Edge(label="  4. sign-in", color="red") >> auth_action
    auth_action >> Edge(label="check is_locked / temp pw", color="red") >> prisma
    admin_action << Edge(label="unlock account (Owner-only)", color="red") << browser
    admin_action >> Edge(color="red") >> prisma
    security_log >> Edge(color="red") >> prisma

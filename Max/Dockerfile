FROM node:22-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget \
  && mkdir -p /usr/local/share/ca-certificates/russian-trusted \
  && wget -q -O /usr/local/share/ca-certificates/russian-trusted/russian_trusted_root_ca.crt \
       https://gu-st.ru/content/lending/russian_trusted_root_ca_pem.crt \
  && wget -q -O /usr/local/share/ca-certificates/russian-trusted/russian_trusted_sub_ca.crt \
       https://gu-st.ru/content/lending/russian_trusted_sub_ca_pem.crt \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install
COPY tsconfig.json ./
COPY miniapp ./miniapp
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
CMD ["npm", "run", "start:bot"]
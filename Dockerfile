# Bun 공식 이미지 사용
FROM oven/bun:1

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 bun.lockb 복사 (있는 경우)
COPY package.json ./
COPY bun.lockb* ./

# 의존성 설치
RUN bun install

# 소스 코드 복사
COPY . .

# 포트 노출 (Express 앱이 사용하는 포트)
EXPOSE 3000

# 애플리케이션 실행
CMD ["bun", "run", "./src/index.ts"]

# SEAL Hackathon Deploy Session - 2026-06-21

File này ghi lại chi tiết cuộc trao đổi và các bước đã làm để ngày mai có thể tiếp tục deploy dự án lên AWS EC2 + domain riêng.

Lưu ý bảo mật: file này không ghi giá trị secret thật trong `.env`, Google OAuth, GitHub OAuth, mail app password, hoặc private key `.pem`.

## Mục Tiêu

- Chạy dự án SEAL Hackathon bằng Docker Compose.
- Deploy lên AWS EC2.
- Gắn domain `sealhackathon.io.vn`.
- Dùng Caddy làm reverse proxy và tự xin HTTPS.
- Dùng GitHub Actions để deploy tự động khi push code.

## Thông Tin Chính

- Repo GitHub: `https://github.com/nhatnhm1405/seal-hackathon-system.git`
- Nhánh đang deploy: `nhatdh-draft`
- AWS region: `ap-southeast-2` - Asia Pacific Sydney
- EC2 instance name: `seal`
- EC2 public IPv4: `32.236.189.42`
- EC2 private IPv4: `172.31.26.144`
- EC2 OS thực tế: Amazon Linux 2023
- User SSH đúng: `ec2-user`
- User `ubuntu` không đúng với instance này
- Domain chính: `sealhackathon.io.vn`
- API subdomain: `api.sealhackathon.io.vn`

## Trạng Thái Local Docker Trên Windows

Ban đầu chạy:

```powershell
sudo docker compose up -d --build
```

Lỗi:

```text
Sudo is disabled on this machine.
```

Kết luận:

- Trên Windows PowerShell không dùng `sudo`.
- Lệnh đúng trên Windows:

```powershell
docker compose up -d --build
```

Kết quả local trước đó:

- Build frontend thành công.
- Build backend thành công.
- `seal_mysql` healthy.
- `seal_backend` started.
- `seal_frontend` started.
- `seal_caddy` running.

URL local:

- Web: `http://localhost`
- API: `http://localhost/api/events`

## Docker Files Trong Project

Các file Docker/deploy cần có ở repo:

```text
docker-compose.yml
Caddyfile
back-end/src/seal-api/Dockerfile
back-end/src/seal-api/.dockerignore
front-end/src/seal-web/Dockerfile
front-end/src/seal-web/Caddyfile
front-end/src/seal-web/.dockerignore
.github/workflows/deploy.yml
```

Đã phát hiện một lần trên AWS thiếu `docker-compose.yml` và `Caddyfile` vì các file này chưa được push lên nhánh `nhatdh-draft`.

Trên AWS khi chạy:

```bash
ls
```

chỉ thấy:

```text
README.md  back-end  docs  front-end
```

Sau đó cần push các file deploy từ máy Windows lên GitHub.

## File `.env`

Đã kiểm tra file:

```text
back-end/src/seal-api/.env
```

Kết luận:

- File `.env` không bị Git track.
- File `.env` được ignore bởi:

```text
back-end/src/seal-api/.gitignore
```

Trong `.gitignore` có dòng:

```text
.env
```

Không được commit hoặc push `.env` lên GitHub.

Trên AWS, `.env` phải tạo thủ công bằng:

```bash
nano back-end/src/seal-api/.env
```

Rồi paste nội dung secret vào. Sau đó lưu trong nano:

```text
Ctrl + O
Enter
Ctrl + X
```

## GitHub Actions

GitHub Actions secrets đã có:

```text
HOST
SSH_KEY
USERNAME
```

Vì instance là Amazon Linux 2023, secret `USERNAME` phải là:

```text
ec2-user
```

Không phải:

```text
ubuntu
```

Workflow hiện có điểm cần chú ý:

- Trigger branch: `nhatdh-draft`
- Nhưng script từng có dòng pull `main`

Cần đảm bảo workflow pull đúng nhánh:

```bash
git pull origin nhatdh-draft
```

Nếu workflow trigger `nhatdh-draft` nhưng server pull `main`, deploy sẽ chạy nhưng code mới trên `nhatdh-draft` không hiển thị.

## DNS iNET

Trong iNET OnePortal đã có bản ghi DNS:

```text
@    A    32.236.189.42
api  A    32.236.189.42
```

TTL: 5 phút.

Ý nghĩa:

- `sealhackathon.io.vn` trỏ về EC2.
- `api.sealhackathon.io.vn` trỏ về EC2.

## AWS Security Group

Security Group:

```text
sg-0cf280adbf7d815f8 (launch-wizard-1)
```

Các inbound rules cần có:

```text
HTTP   TCP  80   0.0.0.0/0
HTTPS  TCP  443  0.0.0.0/0
SSH    TCP  22   My IP hoặc 0.0.0.0/0 tạm thời
```

Đã từng mở SSH thành:

```text
0.0.0.0/0
```

để test kết nối. Sau khi deploy xong nên đổi lại SSH Source thành `My IP` để an toàn hơn.

## Lỗi EC2 Instance Connect

Khi dùng EC2 Instance Connect, lỗi:

```text
Failed to connect to your instance
Error establishing SSH connection to your instance. Try again later.
```

Ban đầu thử username `ubuntu`, vẫn lỗi.

Sau đó dùng SSH từ PowerShell thì biết rõ hơn.

Lệnh sai vì file key không tồn tại:

```powershell
ssh -i "C:\Users\DAO HOANG NHAT\Downloads\seal.pem" ubuntu@32.236.189.42
```

Lỗi:

```text
Identity file ... seal.pem not accessible: No such file or directory.
```

Sau đó tìm đúng key:

```powershell
ssh -i "C:\Users\DAO HOANG NHAT\Downloads\sealHackathon.pem" ubuntu@32.236.189.42
```

Lần đầu SSH hỏi:

```text
Are you sure you want to continue connecting?
```

Trả lời:

```text
yes
```

Sau đó bị:

```text
Connection closed by 32.236.189.42 port 22
```

Kết luận: không phải lỗi port, mà là sai user. Instance là Amazon Linux, nên phải dùng `ec2-user`.

Lệnh đúng:

```powershell
ssh -i "C:\Users\DAO HOANG NHAT\Downloads\sealHackathon.pem" ec2-user@32.236.189.42
```

Sau đó đã vào được terminal:

```bash
[ec2-user@ip-172-31-26-144 ~]$
```

## Cài Docker Trên Amazon Linux 2023

Đã chạy các lệnh:

```bash
sudo dnf update -y
sudo dnf install -y git docker
sudo systemctl enable docker
sudo systemctl start docker
```

Kiểm tra Docker:

```bash
sudo docker --version
```

Kết quả:

```text
Docker version 25.0.14, build 0bab007
```

## Lỗi Thiếu Docker Compose

Chạy:

```bash
sudo docker compose version
```

Lỗi:

```text
docker: 'compose' is not a docker command.
```

Kết luận: Docker đã có, nhưng Compose plugin chưa có.

Đã cài Docker Compose plugin bằng:

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

Kiểm tra lại:

```bash
sudo docker compose version
```

Kết quả:

```text
Docker Compose version v2.29.7
```

## Clone Code Trên AWS

Đã chạy:

```bash
git clone https://github.com/nhatnhm1405/seal-hackathon-system.git
cd seal-hackathon-system
git checkout nhatdh-draft
```

Kết quả:

```text
branch 'nhatdh-draft' set up to track 'origin/nhatdh-draft'.
Switched to a new branch 'nhatdh-draft'
```

## Tạo `.env` Trên AWS

Đã mở:

```bash
nano back-end/src/seal-api/.env
```

Sau đó cần paste nội dung `.env` backend vào, lưu bằng:

```text
Ctrl + O
Enter
Ctrl + X
```

Không ghi secret thật vào file note này.

## Lỗi Thiếu `docker-compose.yml`

Sau khi tạo `.env`, chạy:

```bash
sudo docker compose up -d --build
```

Lỗi:

```text
no configuration file provided: not found
```

Kiểm tra:

```bash
ls
```

Thấy thiếu `docker-compose.yml`:

```text
README.md  back-end  docs  front-end
```

Kết luận: file deploy chưa được push lên GitHub branch `nhatdh-draft`.

Cần push từ Windows:

```powershell
cd "D:\FPT Uni\kì 5\SWP391\seal-hackathon-system"
git add docker-compose.yml Caddyfile .github/workflows/deploy.yml back-end/src/seal-api/Dockerfile back-end/src/seal-api/.dockerignore front-end/src/seal-web/Dockerfile front-end/src/seal-web/Caddyfile front-end/src/seal-web/.dockerignore
git commit -m "Add Docker deployment files"
git push origin nhatdh-draft
```

Sau đó trên AWS:

```bash
git pull origin nhatdh-draft
ls
```

Khi thấy:

```text
docker-compose.yml
Caddyfile
```

mới chạy:

```bash
sudo docker compose up -d --build
```

## Docker Compose Build Trên AWS

Sau khi có file compose, đã chạy:

```bash
sudo docker compose up -d --build
```

Log cho thấy:

- Caddy image pulled.
- MySQL image pulled.
- Backend image build thành công.
- Frontend image build thành công.
- Network created.
- Volumes created.
- `seal_mysql` healthy.
- `seal_backend` started.
- `seal_frontend` started.
- `seal_caddy` bị kẹt ở trạng thái `Starting`.

Đoạn log cuối:

```text
[+] Running 7/8
Network seal-hackathon-system_seal_network   Created
Volume "seal-hackathon-system_caddy_config"  Created
Volume "seal-hackathon-system_db_data"       Created
Volume "seal-hackathon-system_caddy_data"    Created
Container seal_mysql                         Healthy
Container seal_backend                       Started
Container seal_frontend                      Started
Container seal_caddy                         Starting
```

Sau đó màn hình có vẻ đứng lâu ở:

```text
Container seal_caddy Starting
```

## Việc Cần Làm Tiếp Ngày Mai

Nếu terminal vẫn bị kẹt, đóng session EC2 và connect lại.

Sau khi connect lại vào AWS:

```bash
cd seal-hackathon-system
sudo docker compose ps
sudo docker logs seal_caddy --tail=100
```

Nếu Caddy đang chạy `Up`, thử mở:

```text
http://32.236.189.42
https://sealhackathon.io.vn
https://api.sealhackathon.io.vn
```

Nếu Caddy `Restarting` hoặc `Exited`, gửi log:

```bash
sudo docker logs seal_caddy --tail=100
```

Kiểm tra port 80 và 443 có bị chiếm không:

```bash
sudo ss -tulpn | grep -E ':80|:443'
```

Nếu cần restart toàn bộ stack:

```bash
sudo docker compose down
sudo docker compose up -d --build
sudo docker compose ps
```

Nếu muốn xem log theo thời gian thực:

```bash
sudo docker compose logs -f
```

Log riêng từng service:

```bash
sudo docker logs seal_mysql --tail=100
sudo docker logs seal_backend --tail=100
sudo docker logs seal_frontend --tail=100
sudo docker logs seal_caddy --tail=100
```

## Checklist Ngày Mai

1. Connect vào EC2 bằng `ec2-user`.
2. Vào thư mục project:

```bash
cd seal-hackathon-system
```

3. Kiểm tra container:

```bash
sudo docker compose ps
```

4. Nếu `seal_caddy` chưa chạy, xem log:

```bash
sudo docker logs seal_caddy --tail=100
```

5. Nếu Caddy chạy, test IP:

```text
http://32.236.189.42
```

6. Test domain:

```text
https://sealhackathon.io.vn
https://api.sealhackathon.io.vn
```

7. Nếu domain chưa lên, kiểm tra:

- DNS iNET có trỏ về `32.236.189.42` không.
- Security Group có mở port 80/443 không.
- Caddy log có lỗi xin certificate không.

8. Sau khi deploy ổn, đổi SSH Security Group từ `0.0.0.0/0` về `My IP` để an toàn.

## Ghi Chú Về Branch Deploy

Vì đang dùng nhánh:

```text
nhatdh-draft
```

Nên trên server nên đảm bảo:

```bash
git branch
```

đang ở:

```text
* nhatdh-draft
```

Khi cập nhật code thủ công:

```bash
git pull origin nhatdh-draft
sudo docker compose up -d --build
```

GitHub Actions cũng phải pull `nhatdh-draft`, không pull `main`.


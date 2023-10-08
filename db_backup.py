#!/bin/python3
import os
from datetime import datetime
import ftplib
import glob

ftp = ftplib.FTP()
host = "mslepe.cl"
port = 21
ftp.encoding = "utf-8"

# dumpcmd = "mysqldump --defaultsromana > file.sql"
now = str(datetime.now()).replace(" ", "_").split('.')[0]
file_name = "db." + now + ".sql"

try:

    print("generating db backup ...")
    print(file_name)

    dumpcmd = "mysqldump --defaults-file=/root/.my.cnf romana > /home/marcos/romana/backup/" + file_name
    os.system(dumpcmd)

    print("Logging in ...")
    ftp.connect(host, port)
    ftp.login("marcos@mslepe.cl", "VB3428jf4369")
    print("logged in")
    ftp.cwd("/romana/bk/")

    with open(file_name, "rb") as file:
        print("File to upload: " + file.name)
        ftp.storbinary(f"STOR {file.name}", file)

    print("finished uploading file")


    server_files = ftp.nlst()
    server_sql_files = []
    for server_file in server_files:
        if ".sql" in server_file:
            server_sql_files.append(server_file)

    print(server_sql_files)

    #DELETE OLDER FILES IN CLOUD
    while len(server_sql_files) > 40:
        ftp.delete(server_sql_files[0])
        server_sql_files.pop(0)

    ftp.close()

    #DELETE OLDER FILES IN LOCAL SERVER
    db_files = glob.glob("/home/user/Desktop/romana/backup/*.sql")

    while len(db_files) > 120:
        os.system("sudo rm " + db_files[0])
        db_files.pop(0)

    print(len(db_files))

except Exception as e:
    with open('error_log', 'w') as f:
        f.write(str(e) + '\r\n')

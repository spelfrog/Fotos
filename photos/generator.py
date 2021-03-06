import getopt
from datetime import datetime
from multiprocessing import Pool
from os import listdir
from pathlib import Path

import sys

from app import root_folder, video_types, image_types, get_preview


def get_files(path):
    files = []
    unknown_files = []
    folders = []
    if path.exists():
        files_in_folder = listdir(path)
        for f in files_in_folder:
            file = Path(path) / f
            if file.name.startswith("."):
                continue
            elif file.is_file():
                last_suffixes_index = len(file.suffixes) - 1
                if file.suffixes[last_suffixes_index] in video_types or \
                   file.suffixes[last_suffixes_index] in image_types:
                    files.append(file)
                else:
                    unknown_files.append(file)
            else:
                folders.append(file)

    return files, unknown_files, folders


def make_preview(file):
    try:
        get_preview(file)
    except Exception:
        print("Failed %s" % file, file=sys.stderr)
        return 0
    else:
        return 1


def make_thumbnails(location, recursive=0, threads=None):
    print("Scanning", str(location), end=' ')
    files, unknown_files, folders = get_files(location)

    with Pool(threads) as p:
        counter = sum(p.map(make_preview, files))

    print(" -> ", counter, "Thumbnails")

    if recursive > 0:
        for folder in folders:
            counter += make_thumbnails(folder, recursive-1)

    return counter


def main(param):
    recursive = 0
    folder = ""
    threads = None

    try:
        opts, args = getopt.getopt(param, "r:f:t:", ["recursive=", "folder=", "threads="])
    except getopt.GetoptError:
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-r", "--recursive"):
            recursive = int(arg)
        elif opt in ("-f", "--folder"):
            folder = arg
        elif opt in ("-t", "--threads"):
            threads = int(arg)

    print("recursive depth:", recursive)

    start = datetime.now()
    thumbnails = make_thumbnails(root_folder / folder, recursive, threads)

    duration = datetime.now()-start
    print(thumbnails, "Thumbnails waked over", str(duration))


if __name__ == "__main__":
    main(sys.argv[1:])

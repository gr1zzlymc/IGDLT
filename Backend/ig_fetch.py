#!/usr/bin/env python3
import sys, json, os
import instaloader


def fetch_images(url: str):
    shortcode = url.rstrip('/').split('/')[-1]
    L = instaloader.Instaloader(sleep=False, quiet=True)
    session = os.environ.get('IG_SESSIONID')
    if session:
        L.context.sessionid = session
    post = instaloader.Post.from_shortcode(L.context, shortcode)
    if post.typename == 'GraphSidecar':
        images = [node.display_url for node in post.get_sidecar_nodes()]
    else:
        images = [post.url]
    return images


def main():
    if len(sys.argv) < 2:
        print('[]')
        return
    link = sys.argv[1]
    try:
        images = fetch_images(link)
        print(json.dumps(images))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()

from care.media import storage_key_for_asset


def test_storage_key_keeps_object_keys():
    assert storage_key_for_asset("user-123/abcd.png") == "user-123/abcd.png"


def test_storage_key_drops_data_urls():
    assert storage_key_for_asset("data:image/png;base64,aaa") == ""


def test_storage_key_extracts_presigned_r2_path():
    url = (
        "https://abc.r2.cloudflarestorage.com/meallens-care-avatars/"
        "user-123/cover.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=x"
    )
    assert storage_key_for_asset(url) == "user-123/cover.webp"


def test_storage_key_keeps_public_cdn_urls():
    url = "https://images.unsplash.com/photo-123"
    assert storage_key_for_asset(url) == url

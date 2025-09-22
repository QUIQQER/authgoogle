<!DOCTYPE html>
<html>
<head>
    <title>Google OAuth Redirect</title>
</head>
<body>
<script>
    // Token und id_token aus dem URL-Fragment extrahieren
    const params = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');

    if ((accessToken || idToken) && window.opener) {
        window.opener.postMessage({
            googleToken: accessToken,
            googleIdToken: idToken
        }, window.location.origin);
        window.close();
    } else {
        document.body.innerText = 'Kein Token oder kein opener gefunden.';
    }
</script>
</body>
</html>
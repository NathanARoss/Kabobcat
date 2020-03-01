var session = new blockstack.UserSession();

function loggedInHandler(profile) {
    var person = new blockstack.Person(profile);
    console.log(person);

    if (person._profile.username) {
        username.value = person._profile.username;
        document.getElementById("title").innerText += " as " + person._profile.username;
    }
}

function signIn() {
    if (session.isUserSignedIn()) {
        var userData = session.loadUserData();
        loggedInHandler(userData);
    } else if (session.isSignInPending()) {
        session.handlePendingSignIn()
        .then(userData => {
            loggedInHandler(userData);
        })
    } else {
        session.redirectToSignIn(window.location.href);
    }
}

signIn();
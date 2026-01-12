FROM alpine:3.19

# Install noVNC and websockify (the bridge between Web and TCP)
RUN apk add --no-cache novnc websockify bash

# Run the proxy
# It serves web files on 8080 and connects to 'tws-gateway:5900'
CMD ["websockify", "--web", "/usr/share/novnc", "--heartbeat", "30", "0.0.0.0:8080", "tws-gateway:5900"]

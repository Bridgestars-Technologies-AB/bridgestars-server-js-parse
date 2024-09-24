FROM node:16-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 1337
EXPOSE 8108
EXPOSE 27017
EXPOSE 27018
EXPOSE 27019
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]




# FROM node:16
# RUN mkdir parse

# ADD . /parse
# WORKDIR /parse
# RUN npm install

# # ENV APP_ID k4PTFS2R8tSYoZC8UNXzvplbZ38jOmViOkJxJEyE
# # ENV MASTER_KEY m3hD2MtTfjJRXjgEXhxHVLH0LaDT5d4V4RGKnjjj
# # ENV DATABASE_URI mongodb://127.0.0.1:27017/parse

# # Optional (default : 'parse/cloud/main.js')
# # ENV CLOUD_CODE_MAIN cloudCodePath

# # Optional (default : '/parse')
# # ENV PARSE_MOUNT mountPath

# EXPOSE 1337
# EXPOSE 27017
# EXPOSE 27018
# EXPOSE 27019

# # Uncomment if you want to access cloud code outside of your container
# # A main.js file must be present, if not Parse will not start

# # VOLUME /parse/cloud               

# CMD [ "npm", "start" ]




# FROM node:16

# # Create app directory
# WORKDIR /usr/src/app

# # Install app dependencies
# # A wildcard is used to ensure both package.json AND package-lock.json are copied
# # where available (npm@5+)
# COPY package*.json ./

# # RUN npm install
# # If you are building your code for production
# RUN npm ci --only=production

# # Bundle app source
# COPY . .

# EXPOSE 1337
# EXPOSE 27017
# EXPOSE 27018
# EXPOSE 27019
# CMD [ "node", "app.js" ]

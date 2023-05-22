const express = require("express")
const path = require("path")
const {open} = require("sqlite")
const sqlite3 = require("sqlite3")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const app = express();
app.use(express.json())
app.use(cors())
let db = null

const dbpath = path.join(__dirname,"reminderPortal.db")

const intializeDbAndServer = async() => {
    try {
        db = await open({
            filename : dbpath,
            driver : sqlite3.Database
        });
        app.listen(3001, () => {
            console.log("The sever is running at http://localhost:3001/")
        });
    }catch (e) {
        console.log(e.message)
        process.exit(1);
    }
}

intializeDbAndServer();

// POST ### API FOR NEW USER REGISTRATION
app.post("/users", async(request,response) => {
    const {email, name, password} = request.body
    console.log(request.body)
    const hashedPassword = await bcrypt.hash(password,10);
    console.log("hai")
    const selectQuery = `SELECT * FROM users WHERE email = "${email}";`;
    const dbUser = await db.get(selectQuery);
    if (dbUser === undefined) {
        const createNewUserQuery = `INSERT INTO users(email,name,password)
                                    VALUES
                                    (
                                        '${email}',
                                        '${name}',
                                        '${hashedPassword}'
                                    );`;
        const dbResponse = await db.run(createNewUserQuery);
        const id = dbResponse.lastID;
        response.status(200)
        response.send({ Id: id, result:"user Registeration successfull" });
    }
    else {
        response.status(400);
        response.send({result :"User already exists"});
      }
});

// ### MIDDLEWEAR FOR AUTHENTICATION
const authenticateToken = async (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    } else {
      response.status(401);
      response.send({result : "Invalid JWT Token"});
    }
    if (jwtToken !== undefined) {
      jwt.verify(jwtToken, "udaynikhwify", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send({resutl: "Invalid JWT Token"});
        } else {
          request.email = payload.email;
          next();
        }
      });
    }
  };

// POST ### API FOR LOGIN
app.post("/login", async(request, response) => {
    const {email, password} = request.body
    const findUserQuery = `SELECT * FROM users WHERE email='${email}';`;
    const dbUser = await db.get(findUserQuery);
    console.log(email)
    if (dbUser === undefined) {
        response.status(400)
        response.send({result : "Invalid User"})
    }else {
        const isCorrectPassword = await bcrypt.compare(password, dbUser.password)
        if (isCorrectPassword) {
            const payload = {email : email};
            const jwtToken = jwt.sign(payload, "udaynikhwify")
            response.send({jwtToken})
        }else {
            response.status(400)
            response.send({result : "Invalid password"})
        }
    }
})

// POST ### API FOR ADDING NEW REMINDER
app.post("/make-reminder",authenticateToken, async(request, response) => {
    let {email} = request
    console.log("/make-reminder called")
    const getUserIdQuery = `select id from users where email='${email}';`;
    const getUserId = await db.get(getUserIdQuery);
    //console.log(getUserId.user_id);
    const { id,userReminder,userTime,status="pending" } = request.body;
    console.log(request.body)
    const postRequestQuery = `insert into reminders(id,reminder, user_id, time, status) values ("${id}","${userReminder}", ${getUserId.id}, '${userTime}', '${status}');`;

    const responseResult = await db.run(postRequestQuery);
 
    response.send({result: "created reminder"});
    
})

// GET ### API FOR GETTING USER REMINDERS
app.get("/my-reminders",authenticateToken, async(request, response) => {
  let {email} = request
  const getUserQuery = `SELECT * FROM users WHERE email="${email}";`;
  const getUser = await db.get(getUserQuery)
  console.log("/my-reminder/userId called")
  const getRequestQuery = `SELECT * FROM reminders WHERE user_id=${getUser.id};`;

  const responseResult = await db.all(getRequestQuery);
  response.send({reminders: responseResult, user : getUser.name});
})

// DELETE ### API FOR DELETING USER REMINDER
app.delete("/reminders/:reminderId", authenticateToken, async(request, response) => {
  let {email} = request
  const {reminderId} = request.params
  console.log("delete reminder called")
  const getUserIdQuery = `select id from users where email='${email}';`;
  const getUserId = await db.get(getUserIdQuery);
  const getRemindersListQuery = `SELECT * FROM reminders WHERE user_id=${getUserId.id};`;
  const getRemindesList = await db.all(getRemindersListQuery);
  const reminderIdList = getRemindesList.map((each) => each.id)
  if (reminderIdList.includes(reminderId)){
    const deleteQuery = `DELETE FROM reminders where id="${reminderId}";`;
    await db.run(deleteQuery)
    response.send({result : "Reminder Removed"})
  }
  else {
    response.status(401)
    response.send({result : "Invalid Request"})
  }
})


// PUT ### API FOR UPDATION OF REMINDER STATUS

app.put("/reminders-update/:reminderId", authenticateToken, async(request, response) => {
  let {email} = request
  const {reminderId} = request.params
  console.log(reminderId)
  console.log
  console.log("update reminder called")
  const getUserIdQuery = `select id from users where email='${email}';`;
  const getUserId = await db.get(getUserIdQuery);
  const getRemindersListQuery = `SELECT * FROM reminders WHERE user_id=${getUserId.id};`;
  const getRemindesList = await db.all(getRemindersListQuery);
  const reminderIdList = getRemindesList.map((each) => each.id)
  console.log(reminderIdList)
  if (reminderIdList.includes(reminderId)){
    const updateQuery = `UPDATE 
                          reminders
                        SET
                          status = "calledOff"
                          
                        WHERE 
                          id = "${reminderId}";`;
    await db.run(updateQuery)
    response.send({result : "Reminder Called Off"})
  }
  else {
    response.status(401)
    response.send({result : "Invalid Request"})
  }
})

// POST ### API FOR ADDING NEW TODO
app.post("/make-todo",authenticateToken, async(request, response) => {
  let {email} = request
  console.log("/make-todo called")
  const getUserIdQuery = `select id from users where email='${email}';`;
  const getUserId = await db.get(getUserIdQuery);
  //console.log(getUserId.user_id);
  const { id,userTodo,status="pending" } = request.body;
  console.log(request.body)
  const postRequestQuery = `insert into todos(id,todo, user_id, status) values ("${id}","${userTodo}", ${getUserId.id}, '${status}');`;

  const responseResult = await db.run(postRequestQuery);

  response.send({result: "created reminder"});
  
})

// GET ### API FOR GETTING USER TODOS
app.get("/my-todos",authenticateToken, async(request, response) => {
let {email} = request
const getUserQuery = `SELECT * FROM users WHERE email="${email}";`;
const getUser = await db.get(getUserQuery)
console.log("/my-todo/userId called")
const getRequestQuery = `SELECT * FROM todos WHERE user_id=${getUser.id};`;

const responseResult = await db.all(getRequestQuery);
response.send({todos: responseResult, user : getUser.name});
})

// DELETE ### API FOR DELETING USER TODO
app.delete("/todos/:todoId", authenticateToken, async(request, response) => {
let {email} = request
const {todoId} = request.params
console.log("delete reminder called")
const getUserIdQuery = `select id from users where email='${email}';`;
const getUserId = await db.get(getUserIdQuery);
const getTodosListQuery = `SELECT * FROM todos WHERE user_id=${getUserId.id};`;
const getTodosList = await db.all(getTodosListQuery);
const TodosIdList = getTodosList.map((each) => each.id)
if (TodosIdList.includes(todoId)){
  const deleteQuery = `DELETE FROM todos where id="${todoId}";`;
  await db.run(deleteQuery)
  response.send({result : "todo Removed"})
}
else {
  response.status(401)
  response.send({result : "Invalid Request"})
}
})


// PUT ### API FOR UPDATION OF USER TODO STATUS

app.put("/todo-update-complete/:todoId", authenticateToken, async(request, response) => {
let {email} = request
const {todoId} = request.params
console.log(todoId)
console.log("update todo called")
const getUserIdQuery = `select id from users where email='${email}';`;
const getUserId = await db.get(getUserIdQuery);
const getTodosListQuery = `SELECT * FROM todos WHERE user_id=${getUserId.id};`;
const getTodosList = await db.all(getTodosListQuery);
const todoIdList = getTodosList.map((each) => each.id)
console.log(todoIdList)
if (todoIdList.includes(todoId)){
  const updateQuery = `UPDATE 
                        todos
                      SET
                        status = "completed"
                        
                      WHERE 
                        id = "${todoId}";`;
  await db.run(updateQuery)
  response.send({result : "todos Called Off"})
}
else {
  response.status(401)
  response.send({result : "Invalid Request"})
}
})

// PUT ### API FOR UPDATION OF USER TODO STATUS

app.put("/todo-update-pending/:todoId", authenticateToken, async(request, response) => {
  let {email} = request
  const {todoId} = request.params
  console.log(todoId)
  console.log("update todo called")
  const getUserIdQuery = `select id from users where email='${email}';`;
  const getUserId = await db.get(getUserIdQuery);
  const getTodosListQuery = `SELECT * FROM todos WHERE user_id=${getUserId.id};`;
  const getTodosList = await db.all(getTodosListQuery);
  const todoIdList = getTodosList.map((each) => each.id)
  console.log(todoIdList)
  if (todoIdList.includes(todoId)){
    const updateQuery = `UPDATE 
                          todos
                        SET
                          status = "pending"
                          
                        WHERE 
                          id = "${todoId}";`;
    await db.run(updateQuery)
    response.send({result : "todos Pending"})
  }
  else {
    response.status(401)
    response.send({result : "Invalid Request"})
  }
  })
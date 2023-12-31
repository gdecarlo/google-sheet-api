const express = require("express");
const { google } = require("googleapis");
const axios = require("axios");
require("dotenv").config();
const app = express();
const cors = require('cors');
app.use(cors({
    origin: '*'
}));

const port = 5000;
app.use(express.json());
const spreadsheetId = process.env.SPREADSHEET_ID;
// const auth = new google.auth.GoogleAuth({
//   keyFile: "credenciales.json",
//   scopes: ["https://www.googleapis.com/auth/spreadsheets"],
// });

// const aux_private_key = process.env.PRIVATE_KEY.replace(/\\n/g, "\n")
// let aux_private_key = process.env.PRIVATE_KEY.split(String.raw`\n`).join('\n')
let aux_private_key = ""
let  sheets = null;


const initAuth = async () => {
  try {
    const resultado = await axios.get("https://www.mockachino.com/e9676bbe-755c-4b/secret");
    aux_private_key = resultado.data.private_key.split(String.raw`\n`).join('\n')

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.CLIENT_EMAIL,
        private_key: aux_private_key,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheets = google.sheets({ version: "v4", auth });
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1); // exit the process with an error code
  }
};

async function endpointGetSimpleEntity(entityName, req, res) {
  try {
    const response = await getSimpleEntity(entityName);
    res.json(formatRawResponse(response.data.values));
  } catch (error) {
    console.log(error.message);

    res.status(500).send("Hubo un error al obtener los datos");
  }
}

async function getSimpleEntity(entityName) {
  console.log({aux_private_key})
  if (entityName == null)
    throw new Error("El nombre de la entidad no puede ser nulo.");
  return sheets.spreadsheets.values.get({
    spreadsheetId,
    range: entityName,
  });
}
/**
    cambia [[key,key],[value,value]] por [{key:value}]
 * 
 */
function formatRawResponse(data) {
  // Extrae los nombres de las claves (el primer elemento del array)
  const keys = data.shift();

  // Mapea el resto de los elementos del array a objetos
  const objects = data.map((item) => {
    let obj = {};
    keys.forEach((key, i) => {
      // Si la clave es 'id', convierte el valor a un número
      obj[key] = key === "id" ? Number(item[i]) : item[i];
    });
    return obj;
  });
  return objects;
}

app.post("/persona", async (req, res) => {
  // Asume que el cuerpo de la solicitud es un objeto JSON con las propiedades
  const { nombre } = req.body;

  const response = await getSimpleEntity();
  // Obtiene el último ID utilizado
  const lastId = response.data.values.pop()[0]; // Asume que el ID está en la columna A

  // Incrementa el último ID para obtener el nuevo ID
  const newId = parseInt(lastId, 10) + 1;

  // Crea los nuevos datos a escribir
  const data = [newId, nombre];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Persona",
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [data],
      },
    });
    
    res.status(200).send("Datos escritos exitosamente");
  } catch (error) {
    console.log(error);
    res.status(500).send("Hubo un error al escribir los datos");
  }
});

const simpleEntityNames = ["persona", "instrumento","personainstrumento"];

simpleEntityNames.forEach((miEntity) => {
  app.get(`/${miEntity}`, async (req, res) => {
    await endpointGetSimpleEntity(miEntity, req, res);
  });
}, app);


// const getSecret = async ()=>{
//   const resultado = await axios.get("https://www.mockachino.com/e9676bbe-755c-4b/secret");
//   aux_private_key =  resultado.data.private_key;
//   console.log(aux_private_key);
// }

const startServer = async () => {
  await initAuth(); // wait for initialization to complete before starting the server
  app.listen(process.env.PORT || port, () => {
    console.log(
      `Aplicación escuchando en http://localhost:${process.env.PORT || port}`
    );
  });
};

startServer();


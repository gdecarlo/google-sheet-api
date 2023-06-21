const express = require("express");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();
const port = 5000;

const spreadsheetId = process.env.SPREADSHEET_ID;
// const auth = new google.auth.GoogleAuth({
//   keyFile: "credenciales.json",
//   scopes: ["https://www.googleapis.com/auth/spreadsheets"],
// });

//const aux_private_key = process.env.PRIVATE_KEY.replace(/\\n/g, "\n")

const aux_private_key = `-----BEGIN PRIVATE KEY-----
${process.env.PRIVATE_KEY.replace(/\\n/g, "\n")}
-----END PRIVATE KEY-----`;

console.log(aux_private_key);
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.CLIENT_EMAIL,
    private_key: aux_private_key,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
app.use(express.json());

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
    ñ;
    res.status(200).send("Datos escritos exitosamente");
  } catch (error) {
    console.log(error);
    res.status(500).send("Hubo un error al escribir los datos");
  }
});

const simpleEntityNames = ["persona", "instrumento"];

simpleEntityNames.forEach((miEntity) => {
  app.get(`/${miEntity}`, async (req, res) => {
    await endpointGetSimpleEntity(miEntity, req, res);
  });
}, app);

app.listen(process.env.PORT || port, () => {
  console.log(
    `Aplicación escuchando en http://localhost:${process.env.PORT || port}`
  );
});

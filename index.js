const express = require('express');
const bodyParser = require('body-parser');

const CosmosClient = require('@azure/cosmos').CosmosClient

const config = require('./config')

const endpoint = config.endpoint
const key = config.key

const databaseId = config.database.id
const containerId = config.container.id

const options = {
      endpoint: endpoint,
      key: key,
      userAgentSuffix: 'CosmosDBJavascriptCRUD'
    };

const client = new CosmosClient(options)

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Create an item
app.post('/item', async (req, res) => {
    console.log(req.body);
    const itemBody = req.body;
    try {
        const { item } = await client
            .database(databaseId)
            .container(containerId)
            .items.upsert(itemBody);
        console.log(`Created item with id: ${itemBody.id}`);
        res.json({ id: itemBody.id });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Create multiple items
app.post('/items', async (req, res) => {
    console.log(req.body);
    const itemsBody = req.body; // Assuming req.body is an array of items
    if (!Array.isArray(itemsBody)) {
        return res.status(400).send('Request body must be an array of items');
    }
    
    try {
        const createdItems = [];
        for (const itemBody of itemsBody) {
            const { item } = await client
                .database(databaseId)
                .container(containerId)
                .items.upsert(itemBody);
            console.log(`Created item with id: ${itemBody.id}`);
            createdItems.push({ id: itemBody.id });
        }
        res.json(createdItems);
    } catch (error) {
        console.error('Error creating items:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get item by ID
app.get('/item/:id', async (req, res) => {
    const itemId = req.params.id;
    try {
        const { resource: item } = await client
            .database(databaseId)
            .container(containerId)
            .item(itemId)
            .read();
        if (item) {
            res.json(item);
        } else {
            res.status(404).send('Item not found');
        }
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get items by query parameters
app.get('/items', async (req, res) => {
    const queryParams = req.query;
    const querySpec = {
        query: "SELECT * FROM c WHERE " + 
               Object.keys(queryParams).map(key => `c.${key} = @${key}`).join(" AND "),
        parameters: Object.keys(queryParams).map(key => ({ name: `@${key}`, value: queryParams[key] }))
    };

    try {
        const { resources: items } = await client
            .database(databaseId)
            .container(containerId)
            .items.query(querySpec)
            .fetchAll();
        
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Update an item
app.put('/item/:id', async (req, res) => {
    const itemId = req.params.id;
    const updatedItem = req.body;
    updatedItem.id = itemId;
    console.log(req.params)
    
    try {
        const { resource: item } = await client
            .database(databaseId)
            .container(containerId)
            .item(itemId)
            .replace(updatedItem);

        console.log(`Updated item with id: ${itemId}`);
        res.json(item);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

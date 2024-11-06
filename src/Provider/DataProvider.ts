import { RcFile } from "antd/es/upload";

const INFO = {
  fieldDocumentSetId: 'tisa_basedocumentsetid',
  entityNameDocumentSet: 'tisa_documentset',
  entityNameDocument: 'tisa_document'
}

const getBase64 = (file: RcFile): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = (error) => reject(error);
}); 

const entityMap: any = {
  'opportunity': 'opportunities', // Договор
  'tisa_claim': 'tisa_claims', // ЗО
  'contact': 'contacts', // Физ. лицо
  'account': 'accounts', // Юр. лицо
  'tisa_document': 'tisa_documents', // Карточка документа
}


const fieldEntityId: any = {
  'contact': 'tisa_contactid',
  'opportunity': 'tisa_contractid', // Договор
  'tisa_claim': 'tisa_claimid', // ЗО
  'account': 'tisa_accountid', // Юр. лицо
}
export const dataProvider = {
  getDocumentSetId() {
    //@ts-ignore
    const documentSetId = window.parent?.Xrm.Page.getAttribute(INFO.fieldDocumentSetId);
    if(!documentSetId && !documentSetId.getValue()) return undefined;

    return documentSetId.getValue()[0].id;
  },
  getCardDocument(documentSetId: string) {
    //@ts-ignore
    const clientUrl = window.parent?.Xrm.Page.context.getClientUrl();
    const request = clientUrl + `/api/data/v8.2/tisa_documentsets?$select=tisa_documentsetid,tisa_name,tisa_documentidlist&$filter=(tisa_documentsetid eq ${documentSetId.replace('{', '').replace('}', '')})`;
    
    return fetch(request)
      .then(result => result.json())
      .then(data => data?.value[0]?.tisa_documentidlist)
      .catch(err => console.log(err));
  },
  async createAnnotation (fileName: string, documentBody: string | undefined, inputData: {Title: string, Description: string, IsLK: boolean}, documentCode: number, callback: (res: string) => void) {  
    //@ts-ignore
    const entityId = window.parent?.Xrm.Page.data.entity.getId();
    //@ts-ignore
    const entityName = window.parent?.Xrm.Page.data.entity.getEntityName();

    const data = {
      subject: inputData.Title,
      filename: fileName,
      documentbody: documentBody,
      isdocument: true,
      notetext: `${inputData.Description} #Из ЛК#${documentCode};0;${inputData.IsLK ? 1 : 0}#`,
      [`objectid_${entityName}@odata.bind`]: `/${entityMap[entityName]}(${entityId.replace("{", "").replace("}", "")})` // подставлять значения в зависимости от сущности
    };

    try {
      //@ts-ignore
      var clientUrl = window.parent?.Xrm.Page.context.getClientUrl();
      var req = new XMLHttpRequest();
      req.open("POST", encodeURI(clientUrl+`/api/data/v8.2/annotations`), true);
      req.setRequestHeader("Accept", "application/json");
      req.setRequestHeader("Content-Type", "application/json;charset=utf-8");
      req.setRequestHeader("OData-MaxVersion", "4.0");
      req.setRequestHeader("OData-Version", "4.0");
      req.onreadystatechange = function () {
        if (this.readyState === 4) {
            req.onreadystatechange = null;
            if (this.status === 204) {
              callback('success');
            }
        }
      };
      req.send(JSON.stringify(data));
    } catch (error: any) {
      console.log(error.message);
    }
  },
  async treatmentFile(file: any) {
    const documentBody = (await getBase64(file)).replace(/^data:(.*;base64,)?/, '');
    return {
      fileName: file.name,
      documentBody: documentBody
    }
  },
  async getDocument(contractId: string, codeDocument: {code: string}[]) {
    //@ts-ignore
    const clientUrl = window.parent?.Xrm.Page.context.getClientUrl();
    //@ts-ignore
    const entityName = window.parent?.Xrm.Page.data.entity.getEntityName();

    const request = clientUrl + `/api/data/v8.2/tisa_documents?$select=tisa_documentid,tisa_name,tisa_url,createdon,tisa_filename,tisa_filedocumenttype,tisa_url&$filter=(_${fieldEntityId[entityName]}_value eq ${contractId.replace('{', '').replace('}', '')}) and (${this.generateFilterByDocuments(codeDocument)})`;
    
    return fetch(request)
      .then(result => result.json())
      .then(data => data?.value)
      .catch(err => console.log(err));
  },
  generateFilterByDocuments(codeDocuments: {code: string}[]) {
    return codeDocuments.map(doc => `tisa_filedocumenttype eq ${doc.code}`).join(' or ');
  }
};
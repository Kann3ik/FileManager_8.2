import { DownloadOutlined, ExportOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Input, List, message, Modal, Popover, Form, Skeleton, Space, Switch, Typography, Upload, UploadProps, Checkbox, FormProps, Row, Badge } from 'antd';
import { useForm } from 'antd/es/form/Form';
import { useEffect } from 'react';
import { useState } from 'react';
import { dataProvider } from '../Provider/DataProvider';
import moment from 'moment';
import { saveAs } from 'file-saver';

const { Title } = Typography;
const uploadProps: UploadProps = {
  name: 'file',
  style: { width: '100%' },
};

const FileListControl = () => {
  const [files, setFiles] = useState<{ name: string, code: number }[]>([]);
  const [documents, setDocuments] = useState<{
    tisa_documentid: string, tisa_filename: string, tisa_name: string, createdon: string, tisa_filedocumenttype: number, tisa_url: string
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = useForm();

  useEffect(() => {
    init();
  }, [])

  const init = async () => {
    setLoading(true);

    const documentSetId = dataProvider.getDocumentSetId();
    if (!documentSetId) return;
    const cardDocument = JSON.parse(await dataProvider.getCardDocument(documentSetId));
    if (!cardDocument) return;
    //@ts-ignore
    const contractId = window.parent?.Xrm.Page.data.entity.getId();
    const docs = filterAndSortDocuments(await dataProvider.getDocument(contractId, cardDocument))

    setDocuments(docs);
    setFiles(cardDocument);
    setLoading(false);
  }

  const filterAndSortDocuments = (documents: { tisa_documentid: string; tisa_name: string; tisa_filename: string; createdon: string; tisa_filedocumenttype: number; tisa_url: string }[]): { tisa_documentid: string; tisa_filename: string; tisa_name: string; createdon: string; tisa_filedocumenttype: number; tisa_url: string }[] => {
    const sortedDocuments = documents.sort((a, b) => new Date(b.createdon).getTime() - new Date(a.createdon).getTime());
    const uniqueDocuments: { tisa_documentid: string; tisa_filename: string; tisa_name: string; createdon: string; tisa_filedocumenttype: number; tisa_url: string }[] = [];
    const seenTypes: { [key: number]: boolean } = {};

    for (const doc of sortedDocuments) {
      if (!seenTypes[doc.tisa_filedocumenttype]) {
        uniqueDocuments.push(doc);
        seenTypes[doc.tisa_filedocumenttype] = true;
      }
    }

    return uniqueDocuments;
  }

  const reload = () => {
    if (form) form.resetFields();
    init();
  }

  const handleDownload = (href: string, fileName: string) => {
    const documentType = href.split('.');
    saveAs(href, `${fileName.split('.')[0]}.${documentType[documentType.length - 1]}`);
  };

  const handleOpen = (guid: string) => {
    var entityName = "tisa_document";
    //@ts-ignore
    var url = window.parent.Xrm.Page.context.getClientUrl() + "/main.aspx?etn=" + entityName + "&pagetype=entityrecord&id=" + guid;
    window.open(url, '_blank');
  };

  const fileName = (filename: string, createdon: string) => {
    return <span>
      <span className="oneLine">{filename}</span> / <span>{moment(createdon).format('DD-MM-YYYY HH:mm')}</span>
    </span>
  }

  return (
    <div>
      <div className="borderBottom" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <Title level={4} className="colorTitle">Список файлов</Title>
        <Button icon={<ReloadOutlined />} onClick={reload} style={{ width: '35px' }}></Button>
      </div>

      <List
        size='small'
        className="demo-loadmore-list mb-15"
        itemLayout="horizontal"
        dataSource={files}
        renderItem={(item) => {
          const documentsForType = documents.filter(doc => doc.tisa_filedocumenttype === item.code);
          const hasDocuments = documentsForType.length > 0;
          const noDocumentMessage = !hasDocuments ? (
            <p style={{ color: 'tomato' }}>Документ не загружен.</p>
          ) : null;

          return (
            <List.Item style={{maxWidth: 800 }}>
              <Skeleton title={false} loading={loading} active>
                <List.Item.Meta
                  title={<p style={{ margin: 0, maxWidth: 800 }}>{item?.name}</p>}
                  description={
                    <>
                      <CustomForm formId={item.code} item={item} form={form} loading={loading} setLoading={setLoading} reload={reload} />
                      <div style={{ display: 'flex', flexDirection: 'column', width: '797px' }}>
                        {hasDocuments && documentsForType.map(doc => {
                          const badgeColor = doc?.tisa_url ? 'green' : 'volcano';
                          const name = fileName(doc.tisa_filename, doc.createdon);
                          return (
                            <div key={doc.tisa_filedocumenttype} style={{ margin: '5px 0', display: 'flex', justifyContent: 'space-between' }}>
                              <div>
                                <Badge
                                  key="badgeKey"
                                  color={badgeColor}
                                  text={name}
                                />
                              </div>
                              <div>
                                <Button icon={<DownloadOutlined />} onClick={() => handleDownload(doc.tisa_url, doc.tisa_filename)} style={{ height: 24, marginLeft: 5 }}>Скачать</Button>
                                <Button icon={<ExportOutlined />} onClick={() => handleOpen(doc.tisa_documentid)} style={{ height: 24, marginLeft: 5, padding: 0, width: 30 }}></Button>
                              </div>
                            </div>
                          )
                        })}
                        {noDocumentMessage}
                      </div>
                    </>
                  }
                />
              </Skeleton>
            </List.Item>
          )
        }}
      />
    </div>
  )
};

export default FileListControl;

const CustomForm: React.FC<{ formId: number, item: { name: string; code: number; }, form: any, loading: boolean, setLoading: React.Dispatch<React.SetStateAction<boolean>>, reload: () => void }> = ({ formId, item, form, loading, setLoading, reload }) => {
  const [fileData, setFileData] = useState<{ fileName: any; documentBody: string; }>();

  const saveForm = async (code: number) => {
    setLoading(true);
    const values = await form.getFieldsValue(true);

    if (!values || !fileData) {
      message.error('Проверьте введенные данные!');
      setLoading(false);
      return;
    }

    dataProvider.createAnnotation(fileData?.fileName, fileData?.documentBody, { Title: values[`Title_${code}`] ?? '', Description: values[`Description_${code}`] ?? '', IsLK: values[`IsLK_${code}`] }, item.code, (res: string) => {
      if (res === 'success') {
        form.resetFields();
        delay(0.5)
        reload();
        message.success('Примечание создано!');
        setLoading(false);
      } else {
        message.success('Ошибка при создании примечания!');
        setLoading(false);
      }
    });
  }

  const delay = (seconds: number) => {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
  }

  return (
    <Form
      key={item.code}
      form={form}
      name={`FileData_${item?.code}`}
      style={{ marginBottom: -20 }}
    >
      <Row gutter={24} style={{justifyContent: 'space-between'}}>
        <div style={{display: 'flex', flexDirection: 'row'}}>
          <Form.Item name={[`Title_${item.code}`]} style={{ padding: '0 10px' }}>
            <Input placeholder='Заголовок' />
          </Form.Item>
          <Form.Item name={[`Description_${item.code}`]} style={{ padding: '0 10px' }}>
            <Input placeholder='Описание' />
          </Form.Item>
          <Form.Item name={[`IsLK_${item.code}`]} valuePropName="checked" style={{ padding: '0 10px' }}>
            <Checkbox>Доступно в ЛК</Checkbox>
          </Form.Item>
        </div>
        <div style={{display: 'flex', flexDirection: 'row'}}>
          <Form.Item name={[`File_${item.code}`]} valuePropName="checked" style={{ padding: '0 10px' }}>
            <Upload {...uploadProps}
              maxCount={1}
              customRequest={async ({ onSuccess, onError, onProgress, file }) => {
                const fileData = await dataProvider.treatmentFile(file).catch((e) => {
                  onError && onError(e);
                });

                if (!fileData) return;
                setFileData(fileData);
                onProgress && onProgress({ percent: 100 });
                onSuccess && onSuccess(document);
              }}
            >
              <Skeleton title={false} loading={loading} active><Button size="small" type="dashed" icon={<UploadOutlined />}>Выбрать файл</Button></Skeleton>
            </Upload>
          </Form.Item>
          <Form.Item><Button size="small" type="primary" onClick={() => saveForm(item.code)}>Сохранить</Button></Form.Item>
        </div>
      </Row>
    </Form>)
}
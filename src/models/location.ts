import mongoose, { Document, Schema } from 'mongoose';

export type ImageType = 'single' | 'multi';
export type MucDoNguyHiem = 'cao' | 'trung bình' | 'thấp';

export interface IImage {
  url: string;
  caption?: string;
}

export interface ITieuChi {
  diem: number | null;
  mo_ta: string;
}

export interface IChamDiem {
  do_doc:   ITieuChi;
  nguy_co:  MucDoNguyHiem;  // Mức độ nguy hiểm: cao / trung bình / thấp
  taluy:    ITieuChi;
  lop_phu:  ITieuChi;
  loai_dat: ITieuChi;
}

export interface ILocation extends Document {
  ten_xa: string;
  ten_huyen?: string | null;
  ten_tinh?: string | null;
  toa_do: { lat: number; lng: number };
  note?: string;
  image_type: ImageType;
  images: IImage[];
  cham_diem: IChamDiem;
  created_by: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IImage>(
  {
    url:     { type: String, required: true, trim: true },
    caption: { type: String, trim: true },
  },
  { _id: false }
);

const tieuChiSchema = new Schema<ITieuChi>(
  {
    diem:  { type: Number, default: null, min: 1, max: 5 },
    mo_ta: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const chamDiemSchema = new Schema<IChamDiem>(
  {
    do_doc:   { type: tieuChiSchema, required: true },
    nguy_co:  {
      type: String,
      enum: ['cao', 'trung bình', 'thấp'] satisfies MucDoNguyHiem[],
      default: null
    },
    taluy:    { type: tieuChiSchema, default: null },
    lop_phu:  { type: tieuChiSchema, default: null },
    loai_dat: { type: tieuChiSchema, default: null },
  },
  { _id: false }
);

const locationSchema = new Schema<ILocation>(
  {
    ten_xa:    { type: String, default: null, trim: true },
    ten_huyen: { type: String, default: null, trim: true },
    ten_tinh:  { type: String, default: null, trim: true },

    toa_do: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    note: { type: String, trim: true },

    image_type: {
      type: String,
      enum: ['single', 'multi'] satisfies ImageType[],
      required: true,
    },

    images:    { type: [imageSchema], default: [] },
    cham_diem: { type: chamDiemSchema, required: true },

    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

locationSchema.index({ ten_tinh: 1, ten_huyen: 1, ten_xa: 1 });
locationSchema.index({ created_by: 1 });
locationSchema.index({ 'cham_diem.nguy_co': 1 });

const Location = mongoose.model<ILocation>('Location', locationSchema);

export default Location;

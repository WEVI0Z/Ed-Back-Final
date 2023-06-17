import { Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptions, Repository } from "typeorm";
import { Document } from "./entities/document.entity";
import { CreateDocumentDto } from "./dtos/create-document.dto";
import { StatsService } from "src/stats/stats.service";

@Injectable()
export class DocumentsService {
    constructor(
        @InjectRepository(Document)
        private readonly repository: Repository<Document>,         	@Inject(forwardRef(() => StatsService))
        private statsService: StatsService,

    ) { }

    async create(createDocumentDto: CreateDocumentDto, filePath: string): Promise<Document> {
        const doc: Document = this.repository.create({
            title: createDocumentDto.title,
            category: createDocumentDto.category,
            createdAt: createDocumentDto.createdAt,
            file: filePath.split('\\')[1],
        })

        const repoDoc: Document = await this.repository.save(doc);

        return repoDoc;
    }

    async get(category?: string, take: number = 0, offset: number = 0) {
        return await this.repository.find({
            where: {
                category
            },
            take: take,
            skip: offset,
            order: {
                createdAt: "desc",
            }
        })
    }

    async getOne(id: number): Promise<Document> {
        const doc = await this.repository.findOneBy({id});

        if(!doc) {
            throw new NotFoundException("Document not found");
        }

        return doc;
    }
    
    async update(updateDocumentDto): Promise<Document> {
        const document = await this.repository.preload(updateDocumentDto);

        if(!document) {
            throw new NotFoundException("Document not found");
        }

        return this.repository.save(document);
    }    
    async delete(id: number) {
        const doc = await this.repository.findOneBy({id});
        
        await this.statsService.deleteByDoc(doc);

        if(!doc) {
            throw new NotFoundException("Document not found");
        }

        return this.repository.delete(doc);
    }

}
